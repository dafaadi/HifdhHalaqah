import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)



export async function handler(event) {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Only POST allowed" }),
      }
    }

    const authHeader = event.headers.authorization

    if (!authHeader) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Missing auth header" }),
      }
    }

    const token = authHeader.replace("Bearer ", "")

    // 🔐 Verify token & get user
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid token" }),
      }
    }

    const { description, pagesMemorized, pagesRevised} = event.body

    if (
      !Number.isFinite(pagesMemorized) ||
      !Number.isFinite(pagesRevised) ||
      pagesMemorized < 0 ||
      pagesRevised < 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid input values" }),
      }
    }

     // 🧮 Score logic
    let consistencyBonus = await calculateConsistencyBonus() ?? 0
    const rawScore = pagesMemorized * 2 + pagesRevised + consistencyBonus
    // let score = ((pagesMemorized*2) + (pagesRevised))

    const safeScore = Math.max(0, Math.min(rawScore, 100))

    if (rawScore>100){
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Values inserted are too high" }),
      }
    }


  // we are using supabaseAuthed because the rpc function checks for the uid in auth by itself instead of us sending user.id from the server, apparently its more secure
    const supabaseAuthed = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
    )
    
    const {error: entryError} = await supabaseAuthed.rpc("submit_entry", {
      p_description: description,
      p_pages_memorized: pagesMemorized,
      p_pages_revised: pagesRevised,
      p_consistency_multiplier: consistencyBonus,
      p_score: safeScore
    })
    
    if (entryError) {
    console.error(entryError)
    return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to insert entry" }),
      }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  }
}


// function to provide bonus based on streak

async function calculateConsistencyBonus(){

  const { data, error } = await supabase
    .from("entries")
    .select(`id, created_at`)
    .order("created_at", { ascending: false })
    .limit(60)

    if (error){
        console.error(error)
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Failed to fetch entries" }),
        }
    }

    const today = new Date().toISOString().slice(0,10)
    const activeDays = new Set(data.map(entry => new Date(entry.created_at).toISOString().slice(0,10)))
    if (activeDays.has(today)) return

    const bonus_value = activeDays.size * 2
    return bonus_value
}
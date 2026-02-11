import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)



export async function handler(event) {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Only POST allowed" }),
      }
    }

    const authHeader = event.headers.authorization

    if (!authHeader) {
      return {
        statusCode: 401,
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

    const body = JSON.parse(event.body)
    const { description, pagesMemorized, pagesRevised} = body
    const pagesMemorizedNum = Number(pagesMemorized)
    const pagesRevisedNum = Number(pagesRevised)

    if (
      !Number.isFinite(pagesMemorizedNum) ||
      !Number.isFinite(pagesRevisedNum) ||
      pagesMemorizedNum < 0 ||
      pagesRevisedNum < 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid input values" }),
      }
    }

     // 🧮 Score logic
    let userId = user.id
    let consistencyBonus = await calculateConsistencyBonus(userId) ?? 0
    const rawScore = pagesMemorizedNum * 2 + pagesRevisedNum + consistencyBonus
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
      p_pages_memorized: pagesMemorizedNum,
      p_pages_revised: pagesRevisedNum,
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

async function calculateConsistencyBonus(userId){
  
  const current = new Date()
  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1)
  const firstDayISO = firstDay.toISOString()

  const { data, error } = await supabase
  .from("entries")
  .select("created_at")
  .eq("user_id", userId)
  .gte("created_at", firstDayISO)



  if (error){
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch entries" }),
    }
  }

  const today = new Date().toISOString().slice(0,10)
  console.log(today)
  const activeDays = new Set(data.map(entry => new Date(entry.created_at).toISOString().slice(0,10)))
  console.log(activeDays)
  if (activeDays.has(today)) {
    console.log((activeDays.has(today)))
    return 0 
  }

  const bonus_value = activeDays.size * 2
  return bonus_value
}
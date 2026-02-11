import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)



export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" })
    }

    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: "Missing auth header" })
    }

    const token = authHeader.replace("Bearer ", "")

    // 🔐 Verify token & get user
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" })
    }

    const { description, pagesMemorized, pagesRevised} = req.body

    if (
      !Number.isFinite(pagesMemorized) ||
      !Number.isFinite(pagesRevised) ||
      pagesMemorized < 0 ||
      pagesRevised < 0
    ) {
      return res.status(400).json({ error: "Invalid input values" })
    }

     // 🧮 Score logic
    let consistencyBonus = await calculateConsistencyBonus() ?? 0
    const rawScore = pagesMemorized * 2 + pagesRevised + consistencyBonus
    // let score = ((pagesMemorized*2) + (pagesRevised))

    const safeScore = Math.max(0, Math.min(rawScore, 100))

    if (rawScore>100){
      return res.status(400).json({error: "values inserted are too high"})
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
    return res.status(500).json({ error: "Failed to insert entry" })
  }
  
  res.json({ success: true })
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
        return res.status(500).json({ error: "Failed to fetch entries" })
    }

    const today = new Date().toISOString().slice(0,10)
    const activeDays = new Set(data.map(entry => new Date(entry.created_at).toISOString().slice(0,10)))
    if (activeDays.has(today)) return

    const bonus_value = activeDays.size * 2
    return bonus_value
}
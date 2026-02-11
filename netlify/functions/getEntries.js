import { createClient } from "@supabase/supabase-js"

export async function handler(event) {
    if (event.method !== "GET") {
      return res.status(405).json({ error: "Only GET allowed" })
    }
  
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: "Missing auth header" })
    }
  
    const token = authHeader.replace("Bearer ", "")
  
    const supabase = createClient(
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
  
    const { cursor, limit = 11 } = event.queryStringParameters

    let query = supabase
      .from("entries")
      .select(`
          id,
          description,
          pages_memorized,
          pages_revised,
          consistency_multiplier,
          score,
          created_at
      `)
      .order("created_at", { ascending: false })
      .limit(Number(limit))

    if (cursor){
        query = query.lt("created_at", cursor)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return res.status(500).json({ error: "Failed to fetch entries" })
    }

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  }
}

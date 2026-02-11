import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function handler(event) {
  const { data } = await supabase
    .from("scores")
    .select("total_score, profiles(display_name)")
    .order("total_score", { ascending: false })
    .limit(50)

  const leaderboard = data.map((row, index) => ({
    rank: index + 1,
    username: row.profiles?.display_name ?? "Unknown",
    score: row.total_score
  }))

  return {
    statusCode: 200,
    body: JSON.stringify(leaderboard),
  }
}

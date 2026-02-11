import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabase = createClient(
    "https://jmymwgmvnyoumsamzhbv.supabase.co",
    "sb_publishable_GlNzw5sPmgD7e0ah7mo1YQ_F0Dkkm4K")

export async function loginWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/html/profile.html`
    }
  })
}

export async function loginWithDiscord() {
  await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${window.location.origin}/html/profile.html`
    }
  })
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}


const googleBtn = document.querySelector("#googleButton")
const discordBtn = document.querySelector("#discordButton")

if (googleBtn) {
  googleBtn.addEventListener("click", loginWithGoogle)
}
if (discordBtn) {
  discordBtn.addEventListener("click", loginWithDiscord)
}



async function checkLoginStatus(){
    const {data: {session}} = await supabase.auth.getSession()

    if (!session){
        alert("Please login first")
        return
    }

    window.location.href = "/html/profile.html"
}

document.querySelector("#profileButton").addEventListener("click", checkLoginStatus)


import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabase = createClient("https://jmymwgmvnyoumsamzhbv.supabase.co", "sb_publishable_GlNzw5sPmgD7e0ah7mo1YQ_F0Dkkm4K")


const params = new URLSearchParams(window.location.search)

if (params.get("error") === "access_denied") {
  // Clean up the URL (optional but nice)
  window.history.replaceState({}, document.title, "/")

  // Redirect to home/login page
  window.location.replace("/html/home.html")
}



async function sendUnauthorizedHome(){
  const { data: { session } } = await supabase.auth.getSession()
  
        if (!session) {
          window.location.replace("/html/home.html")
        } 
        else document.body.style.visibility = "visible"
}

sendUnauthorizedHome()





export async function logout() {
  const {error} = await supabase.auth.signOut()
    window.location.replace("/html/home.html")
}

document.querySelector("#logoutButton").addEventListener("click",logout)




// 2. Listen for Auth Changes (The Magic Part)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // console.log('User signed in:', session.user)
    
    // 3. Check if the URL still has the ugly hash
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // 4. Clean the URL without reloading the page
      cleanUrl();
    }
    
    // Update your UI here (e.g., hide login button, show profile)
    // updateUI(session.user);
  } 
  // else if (event === 'SIGNED_OUT') {}
})

// UI Update Example
// function updateUI(user) {
//     if(content) content.innerText = `Hello, ${user.email}`;
// }

// Helper function to remove hash parameters
function cleanUrl() {
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);
}




// function to populate profile image and username

const img = document.querySelector("#profileImage")
const displayName = document.querySelector("#profileUsername")

async function populateProfileDetails(){
  const {data: {session}} = await supabase.auth.getSession()

  if(!session) return

  let userData = session.user.user_metadata


  let profilePicture = userData.avatar_url || userData.picture

  // img.setAttribute("src",`${profilePicture}`)
  img.setAttribute("src", `${profilePicture}`)  
  img.referrerPolicy = "no-referrer"


  // check if new user ie. if displayname field not populated, fill with metadata name else return
  const userId = session.user.id

  // 1. Read existing display_name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single()
    
    let defaultUsername
    session.user.app_metadata.provider == "discord" ? defaultUsername = userData.full_name : defaultUsername = userData.name

    // 2. Only write if empty or null
  if (!profile?.display_name) {
    await supabase
    .from("profiles")
    .update({ display_name: defaultUsername })
    .eq("id", userId)

      displayName.innerText = `Salam, ${defaultUsername}`
  }else{
      displayName.innerText = `Salam, ${profile.display_name}`
  }
}

populateProfileDetails()



// function to populate entries table

let entryData
let cursor = null
let cursorHistory = []
const pageSize = 10

const nextButton = document.querySelector("#nextButton")
const previousButton = document.querySelector("#previousButton")


async function populateEntries(){
  cursor = null
  cursorHistory = []
  
  console.log("grabbing entry data")
  const session = (await supabase.auth.getSession()).data.session

  if (!session){
    console.err("not authenticated!")
  }

  const res = await fetch("/.netlify/functions/getEntries?limit=11", {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  })

  entryData = await res.json()
  
  cursorHistory.push(cursor)
  const hasNext = entryData.length > pageSize
  const rowsToRender = entryData.slice(0, 10)

  if (hasNext) nextButton.style.display = "inline-block"
  
  renderEntries(rowsToRender)  
  generateMonthHeatmap(entryData)
  calculateStreak(entryData)
}

populateEntries()



// populating entryTable if no previous entries exist

const entryRows = Array.from(document.querySelectorAll(".entryRow"))

function renderEntries(data){
  // clean out table from previous data
  entryRows.forEach(row => row.replaceChildren())


  data.forEach((entry, i) => {
    const rowNumber = entryRows[i]
    rowNumber.dataset.entryId = entry.id
    
    const createdAt = formatDate(entry.created_at)

    const descriptionElement = document.createElement("div")
    descriptionElement.classList.add("descriptionText")
    descriptionElement.textContent = entry.description

    rowNumber.innerHTML += `<div> ${i+1} </div>`
    rowNumber.appendChild(descriptionElement)
    rowNumber.innerHTML += `<div> ${entry.pages_memorized} </div>`
    rowNumber.innerHTML += `<div> ${entry.pages_revised} </div>`
    rowNumber.innerHTML += `<div> ${entry.consistency_multiplier} </div>`
    rowNumber.innerHTML += `<div> ${createdAt} </div>`
    rowNumber.innerHTML += `<div> ${entry.score} </div>`
    rowNumber.innerHTML += `<div class="deleteButton"> <img src="/resources/delete.png"> </div>`

  })

  cursor = data[data.length - 1].created_at

}

function formatDate(isoString){

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month:"short",
    year:"numeric"
  }).format(new Date(isoString))
}


// logic for deleting entries with event bubbling for buttons added async

document.addEventListener("click", async (e) => {
  if (!e.target.closest(".deleteButton")) return

  console.log("delete button clicked")

  const button = e.target.closest(".deleteButton")
  const parentRow = button.closest(".entryRow")

  const entryId = parentRow.dataset.entryId

  const { error } = await supabase.rpc(
    "delete_entry_and_update_score",
    { p_entry_id: entryId }
  )

  if (error) {
    alert("Delete failed")
    console.error(error)
    return
  }

  parentRow.replaceChildren()
  populateEntries()
})


// next button for entry table pagination

document.querySelector("#nextButton").addEventListener("click", async ()=>  {
  const session = (await supabase.auth.getSession()).data.session

  if (!session){
    console.err("not authenticated!")
  }
  
  let res

  try {
    res = await fetch(`/.netlify/functions/getEntries?limit=11&cursor=${encodeURIComponent(cursor)}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

  } catch (fetchError) {
    console.error(fetchError)
    return
  }

  cursorHistory.push(cursor)

  previousButton.style.display = "inline-block"

  entryData = await res.json()


  const hasNext = entryData.length > pageSize
  const rowsToRender = entryData.slice(0, pageSize)
  renderEntries(rowsToRender)

  if (!hasNext) nextButton.style.display = "none"

})



document.querySelector("#previousButton").addEventListener("click", async ()=>  {
  console.log("prev button clicked")

  if (cursorHistory.length === 0) return

  cursor = cursorHistory[cursorHistory.length - 2] 
  cursorHistory.pop()

  const session = (await supabase.auth.getSession()).data.session

  if (!session){
    console.err("not authenticated!")
  }
  
  let res

  try {
    res = await fetch(
      cursor ? 
      `/.netlify/functions/getEntries?limit=11&cursor=${encodeURIComponent(cursor)}`
      : `/.netlify/functions/getEntries?limit=11`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

  } catch (fetchError){
    console.error(fetchError)
    return
  }

  entryData = await res.json()

  const hasNext = entryData.length > pageSize
  const rowsToRender = entryData.slice(0, pageSize)
   
  renderEntries(rowsToRender)

  if (hasNext) nextButton.style.display = "inline-block"
  
  if (cursorHistory.length==1) previousButton.style.display = "none"
})







// toggle profile settings
const settings = document.querySelector("#profileSettingsContainer")

document.querySelector("#profileImage").addEventListener("click", () => {
  settings.classList.add("visible")
})

document.querySelector("#closeSettingsButton").addEventListener("click", () => {
  settings.classList.remove("visible")
})



// change username functionality

export async function changeUsername(username) {

    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const userId = session.user.id

    const {error} = await supabase
    .from("profiles")
    .update({display_name : username})
    .eq("id", userId)

    if (error){
      console.err(error)
      alert("Please make sure username is between 1 to 20 characters long")
    } else{
      displayName.innerText = `Salam, ${username}`
      alert("Username changed successfully")
    }
}

document.querySelector("#changeUsername").addEventListener("click", async () => {
    let newUsername = document.querySelector("#usernameField").value.trim()
    
    if (newUsername=="") {
      alert("Please enter a valid username")
      return
    }

    try {
        await changeUsername(newUsername)
        console.log("username change submitted successfully")
    }
    catch (err) {
        console.error("failed to submit score:", err)
    }
})








// submit entries
let descriptionInput = document.querySelector("#entryDescriptionInput")
let pagesMemorizedInput = document.querySelector("#numberPagesMemorizedInput")
let pagesRevisedInput = document.querySelector("#numberPagesRevisedInput")

export async function submitEntry(description, pagesMemorized, pagesRevised) {

    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const res = await fetch("/.netlify/functions//submitEntry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 🔑 THIS is the important part
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ description, pagesMemorized, pagesRevised })
    })

    if(res.ok) {
      populateEntries()
      descriptionInput.value = ""
      pagesMemorizedInput.value = ""
      pagesRevisedInput.value = ""
    }
    if (!res.ok) {
      throw new Error("Failed to submit entry")
    }

    return res.json()
}



// sending POST request to server
document.querySelector("#sendInput").addEventListener("click", async () => {
  let entryDescription = descriptionInput.value
  let numberOfPagesMemorized = pagesMemorizedInput.value
  let numberOfPagesRevised = pagesRevisedInput.value


    numberOfPagesMemorized = Number(numberOfPagesMemorized)
    numberOfPagesRevised = Number(numberOfPagesRevised)


    if (!Number.isFinite(numberOfPagesMemorized) || numberOfPagesMemorized < 0 || !Number.isFinite(numberOfPagesRevised) || numberOfPagesRevised < 0) {
      alert("Please enter a valid number")
      return
    }

    
    console.log("button working")
    console.log(`the values to be sent are ${numberOfPagesMemorized}`)

    try {
        await submitEntry(entryDescription, numberOfPagesMemorized, numberOfPagesRevised)
        console.log("score submitted successfully")
        previousButton.style.display = "none"
    }
    catch (err) {
        console.error("failed to submit entry:", err)
    }
}) 




















// setting month name
const monthTitle = document.querySelector("#monthTitle")
let currentMonth = new Date().toLocaleString("default", {month: "long"})
monthTitle.innerText = currentMonth

const year = new Date().getFullYear()
const month = new Date().getMonth()
const daysInMonth = new Date(year, month + 1, 0).getDate()
const tileContainer = document.querySelector("#tileContainer")


function generateHeatmapTiles(){
  for (let day = 0; day < daysInMonth; day++) {
    const tile = document.createElement("div")
    tile.className = "day"
    tileContainer.appendChild(tile)
  }
}

generateHeatmapTiles()

const heatmapTiles = Array.from(document.querySelectorAll(".day")) 

function generateMonthHeatmap(container) {
  container.innerHTML = ""

  let activityArray = generateMonthlyActivityArray(entryData)

  for (let day = 0; day < daysInMonth; day++) {
    const tile = heatmapTiles[day]

    let value = activityArray[day][1]
    let entry = activityArray[day][0]
    tile.style.background = getHeatColor(value) ?? "#e5e7eb"
    tile.title = `Day ${day}: ${entry} entries`
  }
}

function getHeatColor(value) {
  if (value === 0) return "#e5e7eb"
  if (value > 0 && value < 6) return "#9ddbab"
  if (value > 5 && value < 100) return "#45bd55f5"
  if (value>100) return "#2ab9ddec"
}

function generateMonthlyActivityArray(entryData){
  const monthlyActivity = Array.from( {length: daysInMonth}, () => [0, 0])
  let counter = 0

  while(counter < entryData.length){
    const entry = entryData[counter]
    let entryMonth = grabMonth(entry.created_at)
    if (currentMonth != entryMonth) break
    
    let entryDay = Number(grabDay(entry.created_at)) - 1

    monthlyActivity[entryDay][0] +=1
    monthlyActivity[entryDay][1] += entry.score

    counter +=1
  }
  return monthlyActivity
}

function grabMonth(isoString){
  return new Intl.DateTimeFormat("en-GB", {
    month:"long"
  }).format(new Date(isoString))
}

function grabDay(isoString){
  return new Intl.DateTimeFormat("en-GB", {
      day: "numeric"
  }).format(new Date(isoString))
}


function calculateStreak(entries) {
  const days = new Set(
    entries.map(e =>
      new Date(e.created_at).toISOString().slice(0, 10)
    )
  )


  let streak = 0
  let current = new Date()
  
  
  while (true) {
    const dayKey = current.toISOString().slice(0, 10)
    if (!days.has(dayKey)) break
    streak++
    current.setDate(current.getDate() - 1)
  }

  document.querySelector("#streakValue").innerText = streak
}




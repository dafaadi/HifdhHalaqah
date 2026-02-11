let lbContainer = document.querySelector("#leaderboardContainer")

fetch("/netlify/functions/getLeaderboard").then(r => r.json()).then(data => {
    let leaderboardData = data
    console.log(data)

    leaderboardData.forEach((data, index)=> {
        let row = document.createElement("section")
        row.classList.add("dataRow")

        row.innerHTML += `
        <section class="lbData">${data.rank}</section> 
        <section class="lbData">${data.username}</section> 
        <section class="lbData">${data.score}</section> `
        
        if (index==0) Array.from(row.children).forEach(rowChild => rowChild.classList.add("firstRowChild"))
        if (index==1) Array.from(row.children).forEach(rowChild => rowChild.classList.add("secondRowChild"))
        if (index==2) Array.from(row.children).forEach(rowChild => rowChild.classList.add("thirdRowChild"))
        
        lbContainer.appendChild(row)

        // animation code
        setTimeout(() => row.classList.add("show"), 100*index)

    })
})


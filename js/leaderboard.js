let lbContainer = document.querySelector("#leaderboardContainer")

fetch("/.netlify/functions/getLeaderboard").then(r => r.json()).then(data => {
    let leaderboardData = data
    console.log(data)

    leaderboardData.forEach((data, index)=> {
        let row = document.createElement("section")
        row.classList.add("dataRow")

        for(let i=0; i<3; i++){
            const rowElement = document.createElement("div")
            rowElement.classList.add("lbData")
            if (i==0) rowElement.textContent = data.rank
            if (i==1) rowElement.textContent = data.username
            if (i==2) rowElement.textContent = data.score
            row.appendChild(rowElement) 
        }
        
        if (index==0) Array.from(row.children).forEach(rowChild => rowChild.classList.add("firstRowChild"))
        if (index==1) Array.from(row.children).forEach(rowChild => rowChild.classList.add("secondRowChild"))
        if (index==2) Array.from(row.children).forEach(rowChild => rowChild.classList.add("thirdRowChild"))
        
        lbContainer.appendChild(row)

        // animation code
        setTimeout(() => row.classList.add("show"), 100*index)

    })
})


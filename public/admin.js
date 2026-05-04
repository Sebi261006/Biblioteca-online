function logout(){
    window.location="/logout";
}

document.getElementById("addBookForm").addEventListener("submit", e=>{
    e.preventDefault();
    const form = e.target;
    const data = {
        title: form.title.value,
        author: form.author.value,
        description: form.description.value,
        image: form.image.value
    };
    fetch("/addBook",{
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(data)
    }).then(()=>{
        form.reset();
        loadBooks();
        loadStats();
    });
});

function loadBooks(){
    fetch("/adminBooks")
    .then(res=>res.json())
    .then(books=>{
        if(!Array.isArray(books)){
            const container = document.getElementById("adminBooksDiv");
            container.innerHTML = `<p style="color:red;">${books.message || "Nu ai acces la această pagină"}</p>`;
            return;
        }

        const container = document.getElementById("adminBooksDiv");
        container.innerHTML = books.map(b=>`
            <div class="book">
                <h3>${b.title}</h3>
                <p>${b.author}</p>
                <p>⭐ ${b.rating || 0}</p>
                <button onclick="deleteBook(${b.id})">🗑️ Șterge</button>
            </div>
        `).join('');
    })
    .catch(err=>console.error(err));
}

function deleteBook(id){
    fetch(`/deleteBook/${id}`)
    .then(()=>{
        loadBooks();
        loadStats();
    });
}

function loadStats(){
    fetch("/stats")
    .then(res=>res.json())
    .then(data=>{
        const ctx = document.getElementById('statsChart').getContext('2d');
        if(window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, {
            type:'bar',
            data:{
                labels: data.labels || [],
                datasets:[{
                    label:'# Cărți per autor',
                    data: data.values || [],
                    backgroundColor:'rgba(54, 162, 235, 0.6)'
                }]
            },
            options:{
                responsive:true,
                scales: { y: { beginAtZero:true } }
            }
        });
    })
    .catch(err=>console.error(err));
}

// Init
loadBooks();
loadStats();

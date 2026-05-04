document.addEventListener("DOMContentLoaded", () => {

    const booksDiv = document.getElementById("books");
    const searchInput = document.getElementById("search");
    const nav = document.getElementById("navLinks");

    let currentUser = null;
    let allBooks = [];
    let favoriteIds = [];
    let loanIds = [];

    fetch("/me")
    .then(r => r.json())
    .then(user => {
        currentUser = user;
        updateNav();

        if(currentUser){
            fetch("/myFavorites")
            .then(res => res.json())
            .then(ids => {
                favoriteIds = ids;
                fetch("/myLoans")
                .then(res => res.json())
                .then(lids => {
                    loanIds = lids;
                    loadBooks();
                });
            });
        } else {
            loadBooks();
        }
    });

    function updateNav(){
        if(!nav) return;
        nav.innerHTML = "";

        if(currentUser){
            nav.innerHTML += `<span>Bun venit, ${currentUser.username}</span>`;
            nav.innerHTML += `<a href="/favorites.html">Favoritele mele</a>`;
            nav.innerHTML += `<a href="/loans.html">Împrumuturile mele</a>`;
            if(currentUser.isAdmin){
                nav.innerHTML += `<a href="/admin.html">Admin</a>`;
            }
            nav.innerHTML += `<a href="/logout">Logout</a>`;
        } else {
            nav.innerHTML += `<a href="login.html">Login</a>`;
            nav.innerHTML += `<a href="register.html">Register</a>`;
        }

        nav.innerHTML += `<button id="darkBtn">🌙 Dark Mode</button>`;
        document.getElementById("darkBtn").addEventListener("click", () => {
            document.body.classList.toggle("dark");
        });
    }

    function loadBooks(){
        fetch("/books")
        .then(r => r.json())
        .then(data => {
            allBooks = data;
            showBooks(allBooks);
        });
    }

    function showBooks(list){
        booksDiv.innerHTML = "";
        if(list.length === 0){
            booksDiv.innerHTML = "<p>Nu s-a găsit nicio carte 😢</p>";
            return;
        }

        const isLogged = currentUser ? true : false;

        list.forEach(b => {

            const imgSrc = "https://covers.openlibrary.org/b/title/" + encodeURIComponent(b.title) + "-M.jpg";

            let bookHTML = `
            <div class="book">
                <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/150x200?text=No+Image'" class="book-img">
                <h3>${b.title}</h3>
                <p>${b.author}</p>
                <p>⭐ ${b.rating || 0}</p>

                <select onchange="rate(${b.id}, this.value)">
                    <option>Rate</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            `;

            if(isLogged){
                let favText = favoriteIds.includes(b.id) ? "💔 Scoate de la favorite" : "❤️ Favorite";
                let loanText = loanIds.includes(b.id) ? "❌ Returnează" : "📖 Împrumută";

                bookHTML += `
                <div class="book-actions">
                    <button onclick="toggleFavorite(${b.id}, this)">${favText}</button>
                    <button onclick="toggleLoan(${b.id}, this)">${loanText}</button>
                    <button onclick="shareBook('${b.title.replace(/'/g, "")}')">🔗 Share</button>
                </div>
                `;
            }

            bookHTML += `</div>`;
            booksDiv.innerHTML += bookHTML;
        });
    }

    searchInput.addEventListener("input", e => {
        const val = e.target.value.toLowerCase();
        const filtered = allBooks.filter(b =>
            b.title.toLowerCase().includes(val) || b.author.toLowerCase().includes(val)
        );
        showBooks(filtered);
    });

    window.toggleFavorite = function(bookId, btn){
        if(!currentUser) return alert("Trebuie să fii logat!");

        fetch("/favoriteToggle", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({bookId})
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "added"){
                btn.textContent = "💔 Scoate de la favorite";
                favoriteIds.push(bookId);
            } else if(data.status === "removed"){
                btn.textContent = "❤️ Favorite";
                favoriteIds = favoriteIds.filter(id => id !== bookId);
            }
        });
    }

    window.toggleLoan = function(bookId, btn){
        if(!currentUser) return alert("Trebuie să fii logat!");

        fetch("/loanToggle",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({bookId})
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "added"){
                btn.textContent = "❌ Returnează";
                loanIds.push(bookId);
            } else if(data.status === "removed"){
                btn.textContent = "📖 Împrumută";
                loanIds = loanIds.filter(id => id !== bookId);
            }
        });
    }

    window.rate = function(id, val){
        fetch("/rate",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({id:id,rating:val})
        }).then(() => loadBooks());
    };

    window.shareBook = function(title){
        const url = window.location.href + "?book=" + encodeURIComponent(title);
        navigator.clipboard.writeText(url)
            .then(()=> alert("Link copiat: " + url));
    };

});
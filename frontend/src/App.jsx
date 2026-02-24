import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [books, setBooks] = useState([]);

  // This "useEffect" hook tells React to fetch the books as soon as the page loads
  useEffect(() => {
    // We use the URL where your FastAPI is running (usually 8000)
    axios.get('http://127.0.0.1:8000/view_books')
      .then(res => setBooks(res.data))
      .catch(err => console.error("Is the FastAPI server running?", err));
  }, []);

  return (
    <div className="min-h-screen bg-[#faf5ff] p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#9333ea] mb-2">My Reading Vault ✨</h1>
        <p className="text-[#a855f7]">Your literary legacy starts here!</p>
      </header>

      {/* This grid will display the books as cute cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {books.map((book) => (
          <div key={book.id} className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 hover:shadow-purple-200 hover:shadow-lg transition-all">
            <h2 className="text-xl font-bold text-gray-800">{book.title}</h2>
            <p className="text-purple-400 italic mb-4">{book.author}</p>
            
            <div className="flex justify-between items-center mt-4">
              <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold uppercase tracking-wide">
                {book.status}
              </span>
              <span className="text-gray-400 text-sm">{book.total_pages} pages</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
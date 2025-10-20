document.addEventListener('DOMContentLoaded', () => {
    
    // --- AI Calculator Logic ---
    const calcInput = document.getElementById('calc-input');
    const calcBtn = document.getElementById('calc-btn');
    const calcResult = document.getElementById('calc-result');

    const handleCalculation = async () => {
        const prompt = calcInput.value.trim();
        if (!prompt) {
            calcResult.innerText = 'Please enter a problem.';
            return;
        }

        calcResult.innerText = 'Calculating...';
        calcBtn.disabled = true;

        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                calcResult.innerText = data.error;
            } else {
                calcResult.innerText = data.answer;
            }

        } catch (error) {
            console.error('Error:', error);
            calcResult.innerText = 'Sorry, something went wrong.';
        } finally {
            calcBtn.disabled = false;
        }
    };

    if (calcBtn) {
        calcBtn.addEventListener('click', handleCalculation);
    }
    
    if (calcInput) {
        // Allow pressing Enter to calculate
        calcInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleCalculation();
            }
        });
    }

    // --- SuRuu Note Logic ---
    const notePad = document.getElementById('note-pad');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const noteStatus = document.getElementById('note-status');

    // 1. Load the saved note on page load
    if (notePad) {
        const savedNote = localStorage.getItem('suruuNote');
        if (savedNote) {
            notePad.value = savedNote;
        }
    }

    // 2. Save the note when the button is clicked
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', () => {
            const noteContent = notePad.value;
            localStorage.setItem('suruuNote', noteContent);
            
            // Show a confirmation message
            if (noteStatus) {
                noteStatus.innerText = 'Saved!';
                setTimeout(() => {
                    noteStatus.innerText = '';
                }, 2000); // Clear message after 2 seconds
            }
        });
    }

    // --- Bookmarking Logic ---
    const savedChatsList = document.getElementById('saved-chats-list');

    const loadBookmarks = () => {
        if (!savedChatsList) return; // Only run if the element exists

        const bookmarks = JSON.parse(localStorage.getItem('suruuBookmarks') || '[]');
        
        if (bookmarks.length === 0) {
            savedChatsList.innerHTML = '<em>(No bookmarks yet)</em>';
            return;
        }

        // Clear the placeholder
        savedChatsList.innerHTML = '';

        // Display each bookmark
        bookmarks.forEach(chatText => {
            const chatElement = document.createElement('div');
            chatElement.classList.add('saved-chat-item');
            chatElement.innerText = chatText;
            savedChatsList.appendChild(chatElement);
        });
    };

    // --- Load bookmarks when the magic page opens ---
    loadBookmarks();


    // --- PDF Q&A and Flashcard Logic ---
    const pdfUploadInput = document.getElementById('pdf-upload-input');
    const pdfUploadBtn = document.getElementById('pdf-upload-btn');
    const pdfStatus = document.getElementById('pdf-status');
    const pdfInteractionArea = document.getElementById('pdf-interaction-area');
    const pdfQuestionInput = document.getElementById('pdf-question-input');
    const pdfAskBtn = document.getElementById('pdf-ask-btn');
    const pdfFlashcardBtn = document.getElementById('pdf-flashcard-btn');
    const pdfResults = document.getElementById('pdf-results');

    // 1. Handle PDF Upload
    if (pdfUploadBtn) {
        pdfUploadBtn.addEventListener('click', async () => {
            const file = pdfUploadInput.files[0];
            if (!file) {
                pdfStatus.innerText = 'Please select a PDF file.';
                return;
            }

            const formData = new FormData();
            formData.append('pdf', file);

            pdfStatus.innerText = 'Uploading and processing...';
            pdfUploadBtn.disabled = true;

            try {
                const response = await fetch('/api/upload_pdf', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Upload failed');
                }

                pdfStatus.innerText = data.message;
                pdfInteractionArea.style.display = 'block'; // Show Q&A area
                pdfResults.innerHTML = ''; // Clear old results

            } catch (error) {
                console.error('Error:', error);
                pdfStatus.innerText = `Error: ${error.message}`;
            } finally {
                pdfUploadBtn.disabled = false;
            }
        });
    }

    // 2. Handle Asking a Question
    if (pdfAskBtn) {
        pdfAskBtn.addEventListener('click', async () => {
            const question = pdfQuestionInput.value.trim();
            if (!question) {
                pdfResults.innerHTML = '<p class="pdf-error">Please enter a question.</p>';
                return;
            }

            pdfResults.innerHTML = '<p>Thinking...</p>';
            pdfAskBtn.disabled = true;

            try {
                const response = await fetch('/api/ask_pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: question }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to get answer');
                }
                
                // Format the answer
                pdfResults.innerHTML = `<p class="pdf-answer">${data.answer.replace(/\n/g, '<br>')}</p>`;

            } catch (error) {
                console.error('Error:', error);
                pdfResults.innerHTML = `<p class="pdf-error">Error: ${error.message}</p>`;
            } finally {
                pdfAskBtn.disabled = false;
            }
        });
    }

    // 3. Handle Generating Flashcards
    if (pdfFlashcardBtn) {
        pdfFlashcardBtn.addEventListener('click', async () => {
            pdfResults.innerHTML = '<p>Generating flashcards...</p>';
            pdfFlashcardBtn.disabled = true;

            try {
                const response = await fetch('/api/generate_flashcards', {
                    method: 'POST',
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to generate flashcards');
                }
                
                // Format flashcards
                const cards = data.flashcards.split('\n').filter(card => card.trim() !== '');
                let html = '<h3>Flashcards:</h3><div class="flashcard-list">';
                cards.forEach(card => {
                    const parts = card.split('|');
                    const question = parts[0] ? parts[0].trim() : 'N/A';
                    const answer = parts[1] ? parts[1].trim() : 'N/A';
                    html += `
                        <div class="flashcard">
                            <div class="card-question"><strong>Q:</strong> ${question}</div>
                            <div class="card-answer"><strong>A:</strong> ${answer}</div>
                        </div>
                    `;
                });
                html += '</div>';
                pdfResults.innerHTML = html;

            } catch (error) {
                console.error('Error:', error);
                pdfResults.innerHTML = `<p class="pdf-error">Error: ${error.message}</p>`;
            } finally {
                pdfFlashcardBtn.disabled = false;
            }
        });
    }

});
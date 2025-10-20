document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Navbar Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            navToggle.classList.toggle('nav-active');
        });
    }

    // --- Chat Page Specific Logic ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const loading = document.getElementById('loading');

    // Make sure we are on the chat page before running chat logic
    if (!chatBox) return;
    
    // Add the initial message with feedback buttons
    const initialMessage = document.querySelector('.gemini-message');
    if (initialMessage && initialMessage.querySelector('p')) {
        const initialText = initialMessage.querySelector('p').innerText;
        addFeedbackButtons(initialMessage, initialText);
    }


    // Function to add feedback buttons to a message
    function addFeedbackButtons(messageDiv, textToSave) {
        const feedbackBar = document.createElement('div');
        feedbackBar.classList.add('feedback-bar');
        
        const likeBtn = document.createElement('button');
        likeBtn.classList.add('feedback-btn', 'like');
        likeBtn.innerHTML = '👍';
        
        const dislikeBtn = document.createElement('button');
        dislikeBtn.classList.add('feedback-btn', 'dislike');
        dislikeBtn.innerHTML = '👎';

        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.classList.add('feedback-btn', 'bookmark');
        bookmarkBtn.innerHTML = '🔖';

        // Add click logic
        likeBtn.addEventListener('click', () => {
            likeBtn.classList.toggle('active');
            dislikeBtn.classList.remove('active'); // Can't like and dislike
        });

        dislikeBtn.addEventListener('click', () => {
            dislikeBtn.classList.toggle('active');
            likeBtn.classList.remove('active');
        });
        
        // Check if this message is already bookmarked
        let savedChats = JSON.parse(localStorage.getItem('suruuBookmarks') || '[]');
        if (savedChats.includes(textToSave)) {
            bookmarkBtn.classList.add('active');
        }

        bookmarkBtn.addEventListener('click', () => {
            bookmarkBtn.classList.toggle('active');
            
            // Get the latest list from storage
            let currentBookmarks = JSON.parse(localStorage.getItem('suruuBookmarks') || '[]');
            
            if (bookmarkBtn.classList.contains('active')) {
                // Add to bookmarks if not already there
                if (!currentBookmarks.includes(textToSave)) {
                    currentBookmarks.push(textToSave);
                }
            } else {
                // Remove from bookmarks
                currentBookmarks = currentBookmarks.filter(chat => chat !== textToSave);
            }
            
            // Save the updated list back to storage
            localStorage.setItem('suruuBookmarks', JSON.stringify(currentBookmarks));
        });

        feedbackBar.appendChild(likeBtn);
        feedbackBar.appendChild(dislikeBtn);
        feedbackBar.appendChild(bookmarkBtn);
        
        messageDiv.appendChild(feedbackBar);
    }

    // Function to add a message to the chat box
    const addMessage = (sender, messageContent) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const avatar = document.createElement('img');
        avatar.classList.add('avatar');
        avatar.src = sender === 'user' ? 'https://via.placeholder.com/32/D8BFD8/FFFFFF?text=U' : 'https://via.placeholder.com/32/E6E6FA/4B4B4B?text=S';
        avatar.alt = `${sender} icon`;

        const messageP = document.createElement('p');
        
        if (sender === 'user') {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageP);
            messageP.innerText = messageContent;
        } else {
            // For Gemini, we create a wrapper for text and feedback
            const messageContentDiv = document.createElement('div');
            messageContentDiv.classList.add('message-content');
            messageContentDiv.appendChild(avatar);
            messageContentDiv.appendChild(messageP);
            
            let textToSave = ""; // We'll store the text content here

            if (typeof messageContent === 'object' && messageContent !== null) {
                messageP.innerText = messageContent.text;
                textToSave = messageContent.text; // Get the text to save
                if (messageContent.image_url) {
                    const imageElement = document.createElement('img');
                    imageElement.src = messageContent.image_url;
                    imageElement.alt = "Generated Image";
                    imageElement.classList.add('generated-image');
                    messageP.appendChild(document.createElement('br'));
                    messageP.appendChild(document.createElement('br'));
                    messageP.appendChild(imageElement);
                }
            } else {
                messageP.innerText = messageContent;
                textToSave = messageContent; // Get the text to save
            }
            
            messageDiv.appendChild(messageContentDiv); // Add the text/avatar
            addFeedbackButtons(messageDiv, textToSave); // Add the buttons
        }

        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // Function to handle sending the message
    const sendMessage = async () => {
        const prompt = userInput.value.trim();
        if (!prompt) return;

        addMessage('user', prompt);
        userInput.value = '';
        loading.classList.remove('hidden');

        let mode = 'chat';
        let apiPrompt = prompt;

        if (prompt.toLowerCase().startsWith('/imagine ')) {
            mode = 'image';
            apiPrompt = prompt.substring(8).trim();
        }

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: apiPrompt, mode: mode }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            addMessage('gemini', data);

        } catch (error) {
            console.error('Error:', error);
            addMessage('gemini', { text: 'Sorry, something went wrong. Please check the console for details.' });
        } finally {
            loading.classList.add('hidden');
        }
    };

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});
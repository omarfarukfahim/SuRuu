import os
import io
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from pypdf import PdfReader # <-- NEW IMPORT

# Load environment variables from .env file
load_dotenv()

# --- NEW: Create an 'uploads' folder if it doesn't exist ---
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Configure the Gemini API
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except AttributeError as e:
    print("Error: The GEMINI_API_KEY was not found. Please create a .env file and add it.")
    exit()


# Create the Flask app
app = Flask(__name__, static_folder='static', static_url_path='')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- NEW: Global variable to hold PDF context (simple demo method) ---
PDF_CONTEXT = ""

# --- Model Configuration ---
chat_model = genai.GenerativeModel('gemini-2.5-flash')
image_model = genai.GenerativeModel('gemini-pro')
calculator_model = genai.GenerativeModel(
    'gemini-1.5-flash',
    system_instruction="You are an AI calculator. Your sole purpose is to solve the math problem or request given by the user. "
                        "Only return the numerical answer or the direct solution. Do not add any extra text, "
                        "explanations, or conversational phrases. Just return the result."
)

# --- API Route (Chat) ---
@app.route('/api/generate', methods=['POST'])
def generate_content():
    data = request.json
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing prompt'}), 400
    prompt = data.get('prompt')
    mode = data.get('mode', 'chat')
    try:
        if mode == 'chat':
            response = chat_model.generate_content(prompt)
            return jsonify({'text': response.text})
        elif mode == 'image':
            image_description_prompt = f"Create a detailed, photorealistic description of the following scene, suitable for an AI image generator: {prompt}"
            response = image_model.generate_content(image_description_prompt)
            keyword = prompt.split(' ')[-1]
            image_url = f"https://source.unsplash.com/512x512/?{keyword}"
            return jsonify({
                'text': f"*(Simulated Image)* Here is a placeholder image based on your prompt. \n\n**Gemini's Description:**\n {response.text}",
                'image_url': image_url
            })
    except Exception as e:
        return jsonify({'error': f'An error occurred with the API: {str(e)}'}), 500

# --- API Route (AI Calculator) ---
@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing prompt'}), 400
    prompt = data.get('prompt')
    try:
        response = calculator_model.generate_content(prompt)
        return jsonify({'answer': response.text})
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


# --- NEW: PDF API Routes ---

@app.route('/api/upload_pdf', methods=['POST'])
def upload_pdf():
    global PDF_CONTEXT
    
    if 'pdf' not in request.files:
        return jsonify({'error': 'No PDF file found'}), 400
    
    file = request.files['pdf']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and file.filename.endswith('.pdf'):
        try:
            # Save the file (optional, but good practice)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            
            # Read the PDF content
            reader = PdfReader(filepath)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            
            PDF_CONTEXT = text # Store text in our global variable
            
            if not PDF_CONTEXT:
                return jsonify({'error': 'Could not extract text from PDF. It might be an image-based PDF.'}), 500
                
            return jsonify({'message': f'{file.filename} uploaded and processed.'})
            
        except Exception as e:
            return jsonify({'error': f'An error occurred processing the PDF: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Please upload a .pdf'}), 400


@app.route('/api/ask_pdf', methods=['POST'])
def ask_pdf():
    global PDF_CONTEXT
    
    if not PDF_CONTEXT:
        return jsonify({'error': 'Please upload a PDF first.'}), 400
        
    data = request.json
    question = data.get('question')
    
    if not question:
        return jsonify({'error': 'No question provided.'}), 400
        
    try:
        # Create a prompt for Gemini
        prompt = f"""You are a helpful assistant. Use the following document context to answer the user's question.
        If the answer is not in the context, say "I could not find the answer in the document."

        ---
        DOCUMENT CONTEXT:
        {PDF_CONTEXT}
        ---

        QUESTION:
        {question}
        """
        
        response = chat_model.generate_content(prompt)
        return jsonify({'answer': response.text})
        
    except Exception as e:
        return jsonify({'error': f'An error occurred with the API: {str(e)}'}), 500

@app.route('/api/generate_flashcards', methods=['POST'])
def generate_flashcards():
    global PDF_CONTEXT
    
    if not PDF_CONTEXT:
        return jsonify({'error': 'Please upload a PDF first.'}), 400
        
    try:
        prompt = f"""Based on the key information in the following document text, generate a set of 5 to 10 flashcards. 
        Return them *only* in a "Question | Answer" format. 
        Each flashcard must be on a new line. Do not add any other text.

        ---
        DOCUMENT CONTEXT:
        {PDF_CONTEXT}
        ---
        """
        
        response = chat_model.generate_content(prompt)
        return jsonify({'flashcards': response.text})
        
    except Exception as e:
        return jsonify({'error': f'An error occurred with the API: {str(e)}'}), 500


# --- Frontend Routes ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/about')
def serve_about():
    return send_from_directory(app.static_folder, 'about.html')

@app.route('/magic')
def serve_magic():
    return send_from_directory(app.static_folder, 'magic.html')


# --- Run the App ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
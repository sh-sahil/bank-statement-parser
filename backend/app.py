from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import tabula
import os
import numpy as np

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/process-statement', methods=['POST'])
def process_statement():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    bank = request.form.get('bank')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if file and file.filename.endswith('.pdf'):
        pdf_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(pdf_path)
        
        try:
            # Read number of pages
            num_pages = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True)
            
            # Initialize final DataFrame
            final_df = pd.DataFrame()
            
            for i in range(len(num_pages)):
                if i == 0:
                    dfs = tabula.read_pdf(pdf_path, pages=1, relative_area=True, area=[45, 0, 100, 100])
                else:
                    dfs = tabula.read_pdf(pdf_path, pages=i + 1, relative_area=True, area=[5, 0, 100, 100], lattice=False)
                
                df = dfs[0]

                date_indices = df[df['Date'].notna()].index.tolist()
                
                # Process particulars
                combined_particulars_list = []
                for idx in date_indices:
                    combined_particulars = ""
                    if idx - 1 >= 0 and not pd.isna(df.loc[idx - 1, "Particulars"]):
                        combined_particulars += df.loc[idx - 1, "Particulars"] + " "
                    if not pd.isna(df.loc[idx, "Particulars"]):
                        combined_particulars += df.loc[idx, "Particulars"] + " "
                    if idx + 1 < len(df) and not pd.isna(df.loc[idx + 1, "Particulars"]):
                        combined_particulars += df.loc[idx + 1, "Particulars"] + " "
                    combined_particulars_list.append(combined_particulars.strip())

                # Create new rows
                new_rows = []
                for idx, particulars in zip(date_indices, combined_particulars_list):
                    row = df.loc[idx].copy()
                    row['Particulars'] = particulars
                    new_rows.append(row)

                new_df = pd.DataFrame(new_rows)

                if final_df.empty:
                    final_df = new_df
                else:
                    final_df = pd.concat([final_df, new_df], ignore_index=True)
            
            # Add label column
            final_df['label'] = ''
            
            # Handle NaN values
            final_df = final_df.replace({np.nan: None})
            
            # Convert to dictionary for JSON response
            transactions = final_df.to_dict('records')
            
            # Clean up
            os.remove(pdf_path)
            
            return jsonify({
                'success': True,
                'transactions': transactions
            })
            
        except Exception as e:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/api/update-label', methods=['POST'])
def update_label():
    data = request.json
    # In a real application, you would update this in a database
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)
import os

folder = "./uploaded_files"

def deleteFiles():
    if os.path.exists(folder):
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            os.unlink(file_path)
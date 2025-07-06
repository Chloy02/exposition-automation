import os
import json
import face_recognition
from PIL import Image

with open('image_meta.json') as f:
    meta_list = json.load(f)

output_dir = 'cropped_faces'
os.makedirs(output_dir, exist_ok=True)

cropped_meta = []

for item in meta_list:
    image_path = item['filepath']
    image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(image)
    if not face_locations:
        print(f"No face found in {image_path}")
        continue
    for i, (top, right, bottom, left) in enumerate(face_locations):
        face_image = image[top:bottom, left:right]
        pil_image = Image.fromarray(face_image)
        base = os.path.splitext(os.path.basename(image_path))[0]
        out_path = os.path.join(output_dir, f"{base}_face{i+1}.jpg")
        pil_image.save(out_path)
        print(f"Cropped face saved to {out_path}")
        cropped_meta.append({
            'face_path': out_path,
            'sender': item['sender'],
            'date': item['date'],
            'subject': item['subject']
        })

with open('cropped_meta.json', 'w') as f:
    json.dump(cropped_meta, f, indent=2)
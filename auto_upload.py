import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options

with open('cropped_meta.json') as f:
    cropped_meta = json.load(f)

options = Options()
options.add_argument("--headless")  # Remove this line if you want to see the browser

driver = webdriver.Firefox(options=options)

for item in cropped_meta:
    driver.get("https://face-recognise.vercel.app/add-image")
    time.sleep(2)  # Wait for page to load

    # Upload image
    upload = driver.find_element(By.XPATH, "//input[@type='file']")
    upload.send_keys(item['face_path'])
    time.sleep(1)

    # Fill email
    email_input = driver.find_element(By.XPATH, "//input[@placeholder=\"Enter person's email\"]")
    email_input.send_keys(item['sender'])

    # Fill date
    date_input = driver.find_element(By.XPATH, "//input[@placeholder='mm / dd / yyyy']")
    # Try to extract date in yyyy-mm-dd or similar format
    import re
    date_match = re.search(r'(\d{1,2} \w{3} \d{4})', item['date'])
    if date_match:
        from datetime import datetime
        dt = datetime.strptime(date_match.group(1), "%d %b %Y")
        date_input.send_keys(dt.strftime("%m/%d/%Y"))
    else:
        date_input.send_keys("01/01/2024")  # fallback

    # Fill time (if you want, else skip)
    # time_input = driver.find_element(By.XPATH, "//input[@placeholder='--:-- --']")
    # time_input.send_keys("12:00 PM")

    # Submit
    submit_btn = driver.find_element(By.XPATH, "//button[contains(.,'Submit')]")
    submit_btn.click()
    print(f"Uploaded {item['face_path']} for {item['sender']}")
    time.sleep(2)

driver.quit()
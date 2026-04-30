import os
import imaplib
import email



mail = imaplib.IMAP4_SSL('imap.gmail.com')
mail.login('cursorhack2026@gmail.com', 'gyaq qurq kicx hhop')
mail.select('inbox')

_, data = mail.search(None, 'ALL')
ids = data[0].split()

print(f"{len(ids)} unread emails\n")

for num in ids[-5:]:  # last 5 unread
    _, msg_data = mail.fetch(num, '(RFC822)')
    msg = email.message_from_bytes(msg_data[0][1])
    print(f"From: {msg['from']}")
    print(f"Subject: {msg['subject']}")
    print(f"Date: {msg['date']}")
    print("---")

mail.logout()
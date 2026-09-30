$out = 'C:/Users/engel/Desktop/profile/mcq_pages'
New-Item -ItemType Directory -Force $out | Out-Null
$pages = @(
@{
num='42'; title='HTTPS, TLS & Secure Communication'; qs=@(
'1. What is the main purpose of HTTPS? |a) Compress webpages|b) Protect communication over the Internet|c) Store passwords|d) Increase Internet speed'
'2. HTTPS adds which security protocol to HTTP? |a) FTP|b) TLS|c) DNS|d) HTML'
'3. Which threat means secretly listening to data in transit? |a) Eavesdropping|b) Formatting|c) Compression|d) Duplication'
'4. What does TLS encryption do to transmitted data? |a) Makes it unreadable to unauthorized parties|b) Deletes it|c) Makes it public|d) Slows every server'
'5. What can TLS detect during transmission? |a) A changed message|b) A larger screen|c) A new browser|d) A stronger password'
'6. A digital certificate helps the browser verify the _____. |a) Website identity|b) File size|c) Number of users|d) Internet bill'
'7. In the TLS handshake, the server sends a certificate and a _____. |a) Public key|b) Password list|c) Common password|d) Fingerprint'
'8. Which attack pretends to be a legitimate website? |a) Impersonation|b) Backup|c) Rendering|d) Indexing'
'9. What is the result of a secure TLS handshake? |a) A secure connection is established|b) All data becomes public|c) The browser closes|d) The certificate is deleted'
'10. Which statement is correct? |a) HTTPS uses TLS to protect communication|b) HTTPS needs no keys|c) HTTPS sends readable data|d) HTTPS only changes page colors'
)
},
@{
num='43'; title='Public-Key, Common-Key & Certificates'; qs=@(
'11. Public-key cryptography uses _____. |a) One shared key only|b) A public key and a private key|c) No keys|d) Three passwords'
'12. Which method is best for safely sharing a key? |a) Public-key cryptography|b) Common-key cryptography|c) Plain text|d) File compression'
'13. Which method is faster for encrypting large amounts of data? |a) Public-key cryptography|b) Common-key cryptography|c) Certificate-only security|d) Biometric security'
'14. During key exchange, the browser encrypts the common key using the server’s _____. |a) Public key|b) Private key|c) Password|d) Digital signature'
'15. Who can decrypt data encrypted with the server’s public key? |a) The matching private key|b) Any browser|c) A third party|d) The certificate name'
'16. A common key is used mainly to _____. |a) Encrypt and decrypt data quickly|b) Identify a person|c) Sign a certificate|d) Create a website'
'17. A digital signature can detect _____. |a) Tampering|b) Screen brightness|c) Network size|d) Browser history'
'18. Digital signatures also support _____. |a) Non-repudiation|b) Faster typing|c) More storage|d) Anonymous login'
'19. A trusted Certificate Authority signs a digital _____. |a) Certificate|b) Password|c) Browser|d) Shopping cart'
'20. Why does HTTPS combine both key methods? |a) Safety for key sharing and speed for data|b) To remove authentication|c) To avoid encryption|d) To make pages colorful'
)
},
@{
num='44'; title='Authentication, MFA & Combined Protection'; qs=@(
'21. Authentication is the process of _____. |a) Checking identity before access|b) Compressing files|c) Designing a webpage|d) Updating a keyboard'
'22. A password is an example of which factor? |a) Knowledge|b) Possession|c) Biometric|d) Location'
'23. A smartphone or smart card is a ____ factor. |a) Possession|b) Knowledge|c) Biometric|d) Network'
'24. A fingerprint is something you _____. |a) Are|b) Know|c) Have|d) Download'
'25. MFA means using _____. |a) Multiple authentication factors|b) One password twice|c) Faster memory access|d) A common key only'
'26. Which threat is best reduced by authentication and MFA? |a) Unauthorized login|b) Data compression|c) Slow browsing|d) File duplication'
'27. Which example uses biometric authentication? |a) Face recognition|b) Password|c) One-time code|d) Smart card'
'28. In online shopping, HTTPS, a certificate, MFA, and a signature provide _____. |a) Layered protection|b) One single defense|c) No verification|d) Public passwords'
'29. Why are several security technologies combined? |a) Each technology addresses a different risk|b) One tool is always enough|c) To remove encryption|d) To reduce user identity checks'
'30. The strongest summary of the lesson is: |a) Encryption, authentication, certificates, signatures and MFA work together|b) Only passwords matter|c) Public keys replace all security|d) HTTPS is only a visual feature'
)
}
)

function Esc($s){ return [System.Security.SecurityElement]::Escape($s) }
foreach($p in $pages){
  $y=390; $rows=''
  $i=0
  foreach($q in $p.qs){
    $i++; $parts=$q -split '\|'; $question=$parts[0]; $opts=$parts[1..4]
    $rows += "<circle cx='74' cy='$y' r='25' fill='#082b77' stroke='#ff9e00' stroke-width='3'/><text x='74' y='$($y+9)' text-anchor='middle' font-size='23' font-weight='700' fill='white'>$($i+($p.num-42)*10)</text>"
    $rows += "<text x='120' y='$y' class='q'>$(Esc $question)</text>"
    $ox=130; $oy=$y+44
    for($j=0;$j -lt 4;$j++){ $letter=[char](97+$j); $txt=$opts[$j].Substring(3); $rows += "<text x='$ox' y='$oy' class='opt'><tspan font-weight='700'>$letter)</tspan> $(Esc $txt)</text>"; $ox+=255 }
    $y+=105
  }
  $svg=@"
<svg xmlns='http://www.w3.org/2000/svg' width='1240' height='1754' viewBox='0 0 1240 1754'>
<defs><linearGradient id='blue' x1='0' x2='1'><stop stop-color='#061f62'/><stop offset='.55' stop-color='#086ff5'/><stop offset='1' stop-color='#063aaf'/></linearGradient><style>.q{font-family:Arial;font-size:24px;font-weight:700;fill:#073bb8}.opt{font-family:Arial;font-size:20px;fill:#083fba}.small{font-family:Arial;font-size:19px;fill:#063bb6}</style></defs>
<rect width='1240' height='1754' fill='white'/><path d='M0 0h260v360H0z' fill='url(#blue)'/><path d='M0 360h170l90-90v90H0z' fill='#061f62'/>
<text x='130' y='90' text-anchor='middle' fill='white' font-family='Arial' font-size='30' font-weight='700'>Unit</text><text x='130' y='190' text-anchor='middle' fill='#ffad00' font-family='Arial' font-size='90' font-weight='700'>2</text><text x='130' y='245' text-anchor='middle' fill='white' font-family='Arial' font-size='25' font-weight='700'>Cybersecurity</text>
<text x='290' y='78' fill='#164cdc' font-family='Arial' font-size='34' font-weight='700'>Lesson 2-1</text><rect x='290' y='92' width='240' height='8' fill='#f04b22'/><text x='290' y='160' fill='#0a0d54' font-family='Arial' font-size='47' font-weight='700'>$(Esc $p.title)</text>
<text x='290' y='205' fill='#164cdc' font-family='Arial' font-size='26'>Multiple Choice Questions (MCQ)</text><rect x='30' y='245' width='1180' height='70' rx='30' fill='url(#blue)'/><circle cx='75' cy='280' r='30' fill='#082b77' stroke='#fff' stroke-width='3'/><text x='75' y='291' text-anchor='middle' fill='white' font-family='Arial' font-size='32' font-weight='700'>?</text><text x='125' y='292' fill='white' font-family='Arial' font-size='30' font-weight='700'>Choose the correct answer: a, b, c or d</text>
$rows
<rect x='0' y='1680' width='1240' height='74' fill='#f6fbff'/><text x='42' y='1728' fill='#082b77' font-family='Arial' font-size='34' font-weight='700'>$($p.num)</text><text x='530' y='1728' fill='#073bb6' font-family='Arial' font-size='28' font-weight='700'>Dr/Elmahdy</text><text x='945' y='1715' fill='#073bb6' font-family='Arial' font-size='18' font-style='italic'>Secure Today</text><text x='945' y='1738' fill='#073bb6' font-family='Arial' font-size='18' font-style='italic'>Brighter Tomorrow</text>
</svg>
"@
  Set-Content -Path "$out/page_$($p.num).svg" -Value $svg -Encoding UTF8
}
Write-Output "Created $($pages.Count) SVG pages in $out"

import json
import os
import re

# 1. Load Arabic definitions
with open('curriculum_export/curriculum_definitions_only.json', 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

# English terms and definitions mapping
# Exact, official translations matching Egyptian Ministry curriculum for Computer & AI (Secondary 2 Languages)
lang_map = {
    # Unit 1 - Lesson 1: IT Evolution & Social Transformation
    'DEF-001': {
        'term_en': 'First Stage (1940s–1960s)',
        'def_en': 'The emergence of early electronic computers such as ENIAC using vacuum tubes and later transistors; devices were enormous and primarily used for military calculations and scientific research.'
    },
    'DEF-002': {
        'term_en': 'Second Stage (1970s–1980s)',
        'def_en': 'The widespread adoption of Personal Computers (PCs) and the advancement of Integrated Circuits (ICs), marking the transition of computers into businesses, institutions, and homes.'
    },
    'DEF-003': {
        'term_en': 'Third Stage (1990s)',
        'def_en': 'The commercialization of the Internet and the emergence of the World Wide Web (WWW), leading to the globalization of information access and widespread use of electronic mail (E-mail).'
    },
    'DEF-004': {
        'term_en': 'Fourth Stage (2000s: 2000–2009)',
        'def_en': 'The rise and spread of smartphones and mobile Internet technologies, enabling constant, on-the-go connectivity anytime and anywhere.'
    },
    'DEF-005': {
        'term_en': 'Fifth Stage (2010s Onward)',
        'def_en': 'The rapid expansion of Cloud Computing, Big Data analytics, and modern Artificial Intelligence (AI), providing IT infrastructure and software as on-demand services.'
    },
    'DEF-006': {
        'term_en': "Moore's Law",
        'def_en': 'An empirical observation stating that the number of transistors on a microchip doubles approximately every two years, leading to exponential growth in computing power and lower costs.'
    },
    'DEF-007': {
        'term_en': 'Social Networking Services (SNS)',
        'def_en': 'Online interactive platforms that enable users to create profiles, connect with others, communicate instantly, and share digital content and media globally.'
    },
    'DEF-008': {
        'term_en': 'Electronic Commerce (E-Commerce)',
        'def_en': 'The process of buying and selling goods, products, and services, or transmitting funds and data over electronic networks, primarily the Internet.'
    },
    'DEF-009': {
        'term_en': 'Remote Work (Telecommuting)',
        'def_en': 'A flexible working arrangement that allows employees to perform their professional duties outside a traditional office environment using digital tools and Internet connectivity.'
    },
    'DEF-010': {
        'term_en': 'Online Learning (E-Learning)',
        'def_en': 'Educational delivery supported by digital technology and the Internet, allowing learners to access instructional materials, interactive lectures, and quizzes remotely.'
    },
    'DEF-011': {
        'term_en': 'Cashless Payment',
        'def_en': 'Financial transactions executed digitally without physical currency, utilizing bank cards, mobile wallets, QR codes, or contactless payment systems.'
    },
    'DEF-012': {
        'term_en': 'Autonomous Driving',
        'def_en': 'Vehicles equipped with advanced sensors, cameras, radar, and AI algorithms that navigate and operate safely without requiring human driver intervention.'
    },
    'DEF-013': {
        'term_en': 'Edge Computing',
        'def_en': 'A distributed computing paradigm that processes data near the source of generation (such as devices and vehicles) locally, reducing latency and bandwidth usage compared to central clouds.'
    },
    'DEF-014': {
        'term_en': 'Augmented Reality (AR)',
        'def_en': 'A technology that superimposes computer-generated digital information, 3D models, or visuals onto the user’s real-world environment in real time.'
    },
    'DEF-015': {
        'term_en': 'Virtual Reality (VR)',
        'def_en': 'A fully immersive computer-generated simulated environment that isolates the user from physical reality using specialized headsets and sensors.'
    },
    'DEF-016': {
        'term_en': 'Quantum Computing',
        'def_en': 'A rapidly-emerging technology that harnesses the laws of quantum mechanics (superposition and entanglement) to solve complex computational problems beyond the reach of classical computers.'
    },
    'DEF-017': {
        'term_en': 'Cloud Computing',
        'def_en': 'On-demand delivery of computing services—including servers, storage, databases, networking, and software—over the Internet with pay-as-you-go pricing.'
    },
    'DEF-018': {
        'term_en': 'Classical Bit',
        'def_en': 'The basic unit of information in classical computing, representing one of two discrete binary states: strictly 0 or 1 at any given moment.'
    },
    'DEF-019': {
        'term_en': 'Qubit (Quantum Bit)',
        'def_en': 'The fundamental unit of quantum information capable of existing in state 0, state 1, or both simultaneously through the principle of quantum superposition.'
    },

    # Unit 1 - Lesson 2: How AI Works
    'DEF-020': {
        'term_en': 'Artificial Intelligence (AI)',
        'def_en': 'A broad branch of computer science dedicated to creating software and systems capable of performing tasks that typically require human intelligence, such as learning, reasoning, and decision-making.'
    },
    'DEF-021': {
        'term_en': 'Machine Learning (ML)',
        'def_en': 'A subset of AI that provides systems the ability to automatically learn patterns and improve performance from data experience without being explicitly programmed.'
    },
    'DEF-022': {
        'term_en': 'Deep Learning (DL)',
        'def_en': 'A specialized subset of machine learning based on artificial neural networks with multiple hidden layers capable of extracting high-level features from massive volumes of complex data.'
    },
    'DEF-023': {
        'term_en': 'Biological Neural Network',
        'def_en': 'A network of interconnected biological neurons in the human brain that transmit electrochemical signals to process information and coordinate thoughts and actions.'
    },
    'DEF-024': {
        'term_en': 'Artificial Neural Network (ANN)',
        'def_en': 'A computational model inspired by the structure of biological neural networks, consisting of interconnected node layers (input, hidden, and output) that process data mathematical weights.'
    },
    'DEF-025': {
        'term_en': 'Hidden Layers',
        'def_en': 'Intermediate layers in a neural network positioned between the input layer and the output layer, responsible for transforming inputs and extracting complex abstract patterns.'
    },
    'DEF-026': {
        'term_en': 'Generative AI (GenAI)',
        'def_en': 'Artificial intelligence models designed to generate novel, realistic content—such as text, images, code, audio, and synthetic data—based on patterns learned from training datasets.'
    },
    'DEF-027': {
        'term_en': 'Narrow AI (Weak AI)',
        'def_en': 'Artificial intelligence systems designed, trained, and optimized to execute a single specific task or a limited set of closely related tasks (e.g., chess playing, face recognition).'
    },
    'DEF-028': {
        'term_en': 'AI Hallucination',
        'def_en': 'A phenomenon where a generative AI model produces factually incorrect, misleading, or fabricated information with high confidence.'
    },

    # Unit 1 - Lesson 3: AI in Our Daily Life
    'DEF-029': {
        'term_en': 'Recommendation System',
        'def_en': 'An AI-powered algorithm that predicts user preferences and suggests relevant items, products, videos, or songs based on past behavioral history and user patterns.'
    },
    'DEF-030': {
        'term_en': 'Voice Assistant',
        'def_en': 'A software agent that uses natural language processing (NLP) and speech recognition to understand verbal commands and execute automated actions for users.'
    },
    'DEF-031': {
        'term_en': 'Machine Translation',
        'def_en': 'The automated translation of text or speech from one natural human language to another using computer algorithms and neural language models.'
    },
    'DEF-032': {
        'term_en': 'Facial Recognition',
        'def_en': 'A biometric technology that verifies or identifies a person’s identity by analyzing and mapping their facial contours, geometry, and key landmark features.'
    },
    'DEF-033': {
        'term_en': 'AI Medical Diagnostic System',
        'def_en': 'Clinical AI applications that analyze medical images (X-rays, MRI, CT scans) and patient data to assist healthcare professionals in early disease detection and treatment recommendations.'
    },
    'DEF-034': {
        'term_en': 'Autonomous Farming (Smart Agriculture)',
        'def_en': 'Agricultural practices utilizing AI, IoT sensors, drones, and robotics to monitor soil moisture, detect crop diseases, and optimize irrigation and pesticide usage.'
    },
    'DEF-035': {
        'term_en': 'Financial Fraud Detection AI',
        'def_en': 'Machine learning models that analyze banking transactions in real time to identify abnormal deviations, unauthorized card access, and fraudulent behavior.'
    },
    'DEF-036': {
        'term_en': 'Intelligent Chatbot',
        'def_en': 'An interactive conversational program utilizing natural language processing to deliver instant automated support, answers, and guidance to customers.'
    },

    # Unit 1 - Lesson 4: AI Ethics
    'DEF-037': {
        'term_en': 'AI Ethics',
        'def_en': 'A set of moral principles, regulatory guidelines, and social values intended to ensure artificial intelligence is developed and deployed responsibly, equitably, and safely.'
    },
    'DEF-038': {
        'term_en': 'Algorithmic Bias (AI Bias)',
        'def_en': 'Systematic and unfair prejudice in AI outputs resulting from unrepresentative, biased training data or flawed modeling assumptions.'
    },
    'DEF-039': {
        'term_en': 'AI Transparency (Explainability)',
        'def_en': 'The principle that AI system decision-making processes, training methodologies, and underlying logic should be understandable and auditable by humans.'
    },
    'DEF-040': {
        'term_en': 'AI Accountability',
        'def_en': 'The legal and moral obligation of developers, organizations, and deployers to take responsibility for the actions, errors, and societal impacts of their AI systems.'
    },
    'DEF-041': {
        'term_en': 'Data Privacy',
        'def_en': 'The right of individuals to control how their personal data is collected, stored, processed, shared, and utilized by digital platforms and AI systems.'
    },
    'DEF-042': {
        'term_en': 'Deepfake',
        'def_en': 'Hyper-realistic synthetic media (video, photo, or audio) generated using deep learning techniques that convincingly alter or fabricate a person saying or doing things they never did.'
    },
    'DEF-043': {
        'term_en': 'Intellectual Property Rights in AI',
        'def_en': 'Legal protections governing copyright, patents, and ownership of training datasets, AI-generated creative outputs, and model architectures.'
    },
    'DEF-044': {
        'term_en': 'Automated Weapon Systems (Autonomous Weapons)',
        'def_en': 'Military hardware that locates, selects, and engages targets using artificial intelligence and sensor inputs without requiring human authorization.'
    },
    'DEF-045': {
        'term_en': 'Job Displacement (Technological Unemployment)',
        'def_en': 'The loss or restructuring of human employment resulting from the automation of routine and cognitive tasks by AI and robotic systems.'
    },
    'DEF-046': {
        'term_en': 'Digital Divide',
        'def_en': 'The economic and social inequality between demographic groups and geographic regions in their access to, literacy in, and benefit from modern information technologies and AI.'
    },
    'DEF-047': {
        'term_en': 'AI Governance',
        'def_en': 'The framework of laws, regulatory policies, standards, and international treaties established to oversee the ethical deployment and mitigate risks of AI technologies.'
    },
    'DEF-048': {
        'term_en': 'High-Risk AI Systems',
        'def_en': 'AI applications that pose significant potential risks to human safety, fundamental rights, or critical infrastructure (e.g., biometric identification, autonomous vehicles, judicial sentencing).'
    },
    'DEF-049': {
        'term_en': 'General Data Protection Regulation (GDPR)',
        'def_en': 'A comprehensive European privacy law setting strict international standards for data protection, consent requirements, and individual privacy rights.'
    },

    # Unit 2 - Lesson 1: Cryptography and Authentication
    'DEF-050': {
        'term_en': 'Cryptography (Encryption)',
        'def_en': 'The science and practice of transforming readable plaintext into unintelligible ciphertext using mathematical keys to protect confidentiality and integrity.'
    },
    'DEF-051': {
        'term_en': 'Plaintext',
        'def_en': 'Original, unencrypted data or human-readable text prior to passing through an encryption algorithm.'
    },
    'DEF-052': {
        'term_en': 'Ciphertext',
        'def_en': 'The scrambled, unreadable output produced by an encryption algorithm that can only be decrypted back to plaintext with the correct key.'
    },
    'DEF-053': {
        'term_en': 'Cryptographic Key',
        'def_en': 'A specific string of binary bits or characters used by a cryptographic algorithm to lock (encrypt) or unlock (decrypt) information.'
    },
    'DEF-054': {
        'term_en': 'Symmetric Encryption (Secret Key)',
        'def_en': 'A cryptographic method where the exact same secret key is utilized for both encrypting and decrypting data.'
    },
    'DEF-055': {
        'term_en': 'Asymmetric Encryption (Public Key)',
        'def_en': 'A cryptographic system using a mathematically linked pair of keys: a public key for encryption and a private key kept strictly confidential for decryption.'
    },
    'DEF-056': {
        'term_en': 'Public Key',
        'def_en': 'A cryptographic key that can be openly published and distributed to anyone wishing to encrypt messages for the key owner or verify digital signatures.'
    },
    'DEF-057': {
        'term_en': 'Private Key',
        'def_en': 'A secret cryptographic key that must remain confidential to the owner, used to decrypt messages encrypted with the corresponding public key and create digital signatures.'
    },
    'DEF-058': {
        'term_en': 'Hash Function (Cryptographic Hashing)',
        'def_en': 'A one-way mathematical algorithm that converts an arbitrary block of data into a unique, fixed-length alphanumeric hash string.'
    },
    'DEF-059': {
        'term_en': 'Digital Signature',
        'def_en': 'A mathematical technique used to validate the authenticity, non-repudiation, and data integrity of a message, software, or digital document.'
    },
    'DEF-060': {
        'term_en': 'Digital Certificate',
        'def_en': 'An electronic passport issued by a Certificate Authority (CA) that binds a public key to an organization or individual identity and verifies authenticity.'
    },
    'DEF-061': {
        'term_en': 'Certificate Authority (CA)',
        'def_en': 'A trusted third-party organization that verifies identities and issues digital certificates to secure websites and online communications.'
    },
    'DEF-062': {
        'term_en': 'Public Key Infrastructure (PKI)',
        'def_en': 'A comprehensive framework of hardware, software, policies, and procedures needed to create, manage, distribute, use, store, and revoke digital certificates.'
    },
    'DEF-063': {
        'term_en': 'User Authentication',
        'def_en': 'The security process of validating and confirming the identity of a user, service, or computer attempting to access a system or resource.'
    },
    'DEF-064': {
        'term_en': 'Single-Factor Authentication (SFA)',
        'def_en': 'An authentication method that requires only one category of credential (typically a username and password) to grant access.'
    },
    'DEF-065': {
        'term_en': 'Multi-Factor Authentication (MFA / 2FA)',
        'def_en': 'A security mechanism that requires users to provide two or more distinct verification factors (knowledge, possession, inherence) to gain access.'
    },
    'DEF-066': {
        'term_en': 'Biometric Authentication',
        'def_en': 'A security verification process based on the unique physiological or behavioral characteristics of an individual, such as fingerprints, facial geometry, or iris scans.'
    },

    # Unit 2 - Lesson 2: Data and Information Protection
    'DEF-067': {
        'term_en': 'Cybersecurity',
        'def_en': 'The practice of protecting critical networks, devices, servers, programs, and data from unauthorized access, cyberattacks, alteration, or destruction.'
    },
    'DEF-068': {
        'term_en': 'CIA Triad',
        'def_en': 'The foundational model of cybersecurity security architecture consisting of Confidentiality, Integrity, and Availability.'
    },
    'DEF-069': {
        'term_en': 'Confidentiality',
        'def_en': 'The security principle ensuring that sensitive data is kept private and accessible only to authorized individuals or entities.'
    },
    'DEF-070': {
        'term_en': 'Integrity',
        'def_en': 'The security principle ensuring that data remains accurate, complete, and protected against unauthorized modification or deletion throughout its lifecycle.'
    },
    'DEF-071': {
        'term_en': 'Availability',
        'def_en': 'The security principle ensuring that information, network systems, and digital services are reliably accessible to authorized users whenever needed.'
    },
    'DEF-072': {
        'term_en': 'Malware (Malicious Software)',
        'def_en': 'Any intrusive software intentionally designed to damage, exploit, steal data, or compromise computers, networks, and mobile devices.'
    },
    'DEF-073': {
        'term_en': 'Computer Virus',
        'def_en': 'A type of malicious program that attaches itself to legitimate host files and replicates when the host executable is run, causing harm to the operating system.'
    },
    'DEF-074': {
        'term_en': 'Computer Worm',
        'def_en': 'A standalone malware program that replicates autonomously and spreads across networks without requiring user interaction or a host program.'
    },
    'DEF-075': {
        'term_en': 'Trojan Horse',
        'def_en': 'Malicious code disguised as legitimate or useful software that deceives users into installing it, thereby creating a backdoor for attackers.'
    },
    'DEF-076': {
        'term_en': 'Ransomware',
        'def_en': 'A severe form of extortion malware that encrypts a victim’s files or locks their system, demanding a ransom payment in exchange for the decryption key.'
    },
    'DEF-077': {
        'term_en': 'Spyware',
        'def_en': 'Stealthy software that monitors user activities, keystrokes, and personal credentials without consent, transmitting collected intelligence to malicious third parties.'
    },
    'DEF-078': {
        'term_en': 'Firewall',
        'def_en': 'A network security device that monitors, filters, and inspects incoming and outgoing network traffic based on predetermined organizational security rules.'
    },
    'DEF-079': {
        'term_en': 'Access Control',
        'def_en': 'A security technique that regulates who or what can view or use resources in a computing environment, utilizing identification, authorization, and auditing.'
    },

    # Unit 2 - Lesson 3: Incident Response & Risk Management
    'DEF-080': {
        'term_en': 'Social Engineering',
        'def_en': 'The psychological manipulation of individuals into divulging confidential information, revealing passwords, or performing actions that compromise security.'
    },
    'DEF-081': {
        'term_en': 'Phishing',
        'def_en': 'A cybercrime where attackers impersonate trustworthy institutions via deceptive emails or messages to lure targets into providing credentials or financial information.'
    },
    'DEF-082': {
        'term_en': 'Spear Phishing',
        'def_en': 'A highly customized and targeted phishing attempt directed at specific individuals or organizations utilizing researched personal context.'
    },
    'DEF-083': {
        'term_en': 'Smishing (SMS Phishing)',
        'def_en': 'A phishing attack executed via deceptive SMS text messages containing malicious links or fraudulent requests for sensitive verification data.'
    },
    'DEF-084': {
        'term_en': 'Vishing (Voice Phishing)',
        'def_en': 'A social engineering attack conducted over telephone voice calls where the attacker impersonates a bank, authority, or technician to extract secrets.'
    },
    'DEF-085': {
        'term_en': 'Baiting',
        'def_en': 'A social engineering scheme that entices victims with an attractive promise or free physical media (like infected USB drives) to infect their computers.'
    },
    'DEF-086': {
        'term_en': 'Pretexting',
        'def_en': 'An attack strategy where the criminal invents an elaborate, believable scenario (pretext) to persuade the victim to release restricted information or access.'
    },
    'DEF-087': {
        'term_en': 'Denial of Service (DoS)',
        'def_en': 'A cyberattack designed to overwhelm a target server, network, or website with excessive bogus traffic, making it unavailable to legitimate users.'
    },
    'DEF-088': {
        'term_en': 'Distributed Denial of Service (DDoS)',
        'def_en': 'A massive DoS attack launched simultaneously from thousands of compromised internet-connected devices (botnets) distributed globally.'
    },
    'DEF-089': {
        'term_en': 'Botnet',
        'def_en': 'A network of malware-infected internet-connected computers and IoT devices controlled remotely by a cybercriminal without the owners’ knowledge.'
    },
    'DEF-090': {
        'term_en': 'Zero-Day Vulnerability',
        'def_en': 'A software security flaw that is unknown to the software vendor or developers, leaving zero days to patch it before active exploitation by attackers.'
    },
    'DEF-091': {
        'term_en': 'Security Incident Response',
        'def_en': 'A structured, systematic methodology an organization follows to identify, contain, eradicate, and recover from cybersecurity breaches and cyberattacks.'
    },
    'DEF-092': {
        'term_en': 'Incident Response Life Cycle (NIST / SANS)',
        'def_en': 'A standardized six-phase process: Preparation, Detection & Analysis, Containment, Eradication, Recovery, and Post-Incident Lessons Learned.'
    },
    'DEF-093': {
        'term_en': 'Cyber Risk Management',
        'def_en': 'The ongoing organizational process of identifying, analyzing, evaluating, and mitigating risks associated with electronic information systems.'
    },
    'DEF-094': {
        'term_en': 'Security Patching (Patch Management)',
        'def_en': 'The systematic practice of acquiring, testing, and applying software updates released by vendors to close identified security vulnerabilities.'
    },
    'DEF-095': {
        'term_en': 'Data Backup',
        'def_en': 'The practice of copying and archiving critical operational data to an independent location to enable rapid restoration in case of deletion, corruption, or ransomware.'
    },
    'DEF-096': {
        'term_en': '3-2-1 Backup Rule',
        'def_en': 'A gold-standard backup strategy: maintain at least 3 copies of your data, stored on 2 different types of media, with 1 copy kept completely off-site or in the cloud.'
    },

    # Unit 3 - Lesson 1: General Architecture of Web Applications
    'DEF-097': {
        'term_en': 'Web Application (Web App)',
        'def_en': 'An interactive software program stored on a remote web server and executed through an Internet browser client interface over a network.'
    },
    'DEF-098': {
        'term_en': 'Front-End (Client-Side)',
        'def_en': 'The presentation layer and visual interface of a web application that users see and interact with directly inside their browser, built with HTML, CSS, and JavaScript.'
    },
    'DEF-099': {
        'term_en': 'Back-End (Server-Side)',
        'def_en': 'The behind-the-scenes server environment that powers web applications, responsible for processing business logic, handling authentication, and interacting with databases.'
    },
    'DEF-100': {
        'term_en': 'Database',
        'def_en': 'An organized, persistent digital repository designed to store, manage, query, and retrieve structured information and relational data securely.'
    },
    'DEF-101': {
        'term_en': 'Three-Tier Architecture',
        'def_en': 'A modular client-server software architecture that separates a web application into three distinct functional tiers: Presentation Tier, Application Logic Tier, and Data Storage Tier.'
    },

    # Unit 3 - Lesson 2: Communication Methods in Web Applications
    'DEF-102': {
        'term_en': 'Client (Web Browser)',
        'def_en': 'The computing hardware or software application (such as Chrome or Firefox) that initiates requests for resources and displays web interfaces to the user.'
    },
    'DEF-103': {
        'term_en': 'Server (Web Server)',
        'def_en': 'A computer system or software application that listens on network ports, accepts incoming client requests, executes logic, and returns formatted responses.'
    },
    'DEF-104': {
        'term_en': 'Client-Server Communication: Request & Response',
        'def_en': 'The fundamental network model where the client sends an HTTP Request message and the server returns an HTTP Response containing data or status codes.'
    },
    'DEF-105': {
        'term_en': 'HTTP Protocol',
        'def_en': 'Hypertext Transfer Protocol; an application-layer standard protocol used to transmit hypertext documents and multimedia data across the World Wide Web in unencrypted plain text.'
    },
    'DEF-106': {
        'term_en': 'HTTPS Protocol',
        'def_en': 'Hypertext Transfer Protocol Secure; the encrypted version of HTTP that uses SSL/TLS encryption to establish a secure, authenticated channel between browser and server.'
    },
    'DEF-107': {
        'term_en': 'HTTP Request Method (HTTP Verb)',
        'def_en': 'A standardized command indicating the desired action to be performed on a specified web resource (such as GET, POST, PUT, DELETE).'
    },
    'DEF-108': {
        'term_en': 'HTTP GET Method',
        'def_en': 'An HTTP method used strictly to retrieve and read data from a web server without making any modifications to the server state; parameters are visible in the URL query string.'
    },
    'DEF-109': {
        'term_en': 'HTTP POST Method',
        'def_en': 'An HTTP method used to send and submit data to a web server to create or process a resource; submitted data is securely encapsulated inside the request body.'
    },
    'DEF-110': {
        'term_en': 'Examples of GET Method',
        'def_en': 'Loading a webpage, searching on Google, viewing a product catalog, or fetching a student profile where data is requested without altering server state.'
    },
    'DEF-111': {
        'term_en': 'Examples of POST Method',
        'def_en': 'Logging into an account with credentials, submitting a quiz answer form, uploading a file, or processing an e-commerce credit card purchase.'
    },
    'DEF-112': {
        'term_en': 'HTTP Status Code',
        'def_en': 'A three-digit numeric code issued by a web server indicating the result and outcome of an HTTP request (e.g., 2xx success, 4xx client errors, 5xx server errors).'
    },
    'DEF-113': {
        'term_en': 'Status Code 200 (OK)',
        'def_en': 'A standard HTTP success status code indicating that the client request has succeeded and the server has returned the requested resource.'
    },
    'DEF-114': {
        'term_en': 'Status Code 404 (Not Found)',
        'def_en': 'A standard HTTP client error code indicating that the server cannot locate the requested URL or resource.'
    },
    'DEF-115': {
        'term_en': 'Status Code 500 (Internal Server Error)',
        'def_en': 'A generic HTTP server error status code indicating that the server encountered an unexpected internal condition that prevented it from fulfilling the request.'
    },
    'DEF-116': {
        'term_en': 'Application Programming Interface (API)',
        'def_en': 'A set of rules, communication protocols, and subroutines that allows different software applications to communicate and exchange data seamlessly.'
    },
    'DEF-117': {
        'term_en': 'Role of API in Web Applications',
        'def_en': 'Serving as a bridge that connects the user interface (front-end) to server logic and databases, allowing dynamic data updates without refreshing entire web pages.'
    },
    'DEF-118': {
        'term_en': 'JSON Format',
        'def_en': 'JavaScript Object Notation; a lightweight, human-readable, and machine-parsable data-interchange text format organized as key-value pairs and arrays.'
    },

    # Unit 3 - Lesson 3: Fundamentals of Front-End Technology
    'DEF-119': {
        'term_en': 'HTML (HyperText Markup Language)',
        'def_en': 'The foundational markup language used to structure web pages and organize content elements like headings, paragraphs, images, links, and forms.'
    },
    'DEF-120': {
        'term_en': 'CSS (Cascading Style Sheets)',
        'def_en': 'A stylesheet language used to design, style, and visually format HTML documents, controlling colors, typography, spacing, layouts, and responsive adaptations.'
    },
    'DEF-121': {
        'term_en': 'JavaScript (JS)',
        'def_en': 'A dynamic, high-level programming language used to add interactivity, animations, dynamic user interactions, and asynchronous communications to web pages.'
    },
    'DEF-122': {
        'term_en': 'Semantic HTML',
        'def_en': 'The practice of writing HTML markup using tags that convey the meaning and purpose of content elements to browsers, screen readers, and search engines.'
    },
    'DEF-123': {
        'term_en': '<header> Semantic Tag',
        'def_en': 'A semantic HTML container element representing introductory content, page branding, headings, and primary navigation links at the top of a page or article.'
    },
    'DEF-124': {
        'term_en': '<nav> Semantic Tag',
        'def_en': 'A semantic HTML element specifically designated to contain major navigational link menus within a website.'
    },
    'DEF-125': {
        'term_en': '<main> Semantic Tag',
        'def_en': 'A semantic HTML element that wraps the dominant, central content unique to that specific web document, excluding sidebars, banners, and footers.'
    },
    'DEF-126': {
        'term_en': '<footer> Semantic Tag',
        'def_en': 'A semantic HTML container positioned at the bottom of a page or section, typically containing copyright notices, authorship details, and secondary links.'
    },
    'DEF-127': {
        'term_en': 'Web Accessibility (a11y)',
        'def_en': 'The design and development practice of making websites, digital tools, and web technologies usable by everyone, including people with diverse disabilities.'
    },
    'DEF-128': {
        'term_en': 'Accessibility Benefits of Semantic HTML',
        'def_en': 'Assisting screen readers and assistive technologies in interpreting document hierarchy, announcing landmark regions, and enabling keyboard navigation for impaired users.'
    },
    'DEF-129': {
        'term_en': 'Search Engine Optimization (SEO)',
        'def_en': 'The practice of optimizing web page structure, semantic content, and metadata to improve ranking visibility and discoverability in search engines like Google.'
    },
    'DEF-130': {
        'term_en': 'SEO Benefits of Semantic HTML',
        'def_en': 'Helping search engine web crawlers accurately index the primary topics, headings, and context of a website, thereby enhancing organic search ranks.'
    },
    'DEF-131': {
        'term_en': 'Responsive Web Design (RWD)',
        'def_en': 'A web design approach using flexible grids, fluid layouts, and CSS media queries to ensure pages render smoothly on mobile, tablet, and desktop screens.'
    },
    'DEF-132': {
        'term_en': 'Mobile-First Design',
        'def_en': 'A development strategy that prioritizes designing the interface and experience for small mobile screens first before progressively enhancing it for larger desktop viewports.'
    },
    'DEF-133': {
        'term_en': 'Front-End Framework / Library',
        'def_en': 'A pre-written collection of standardized JavaScript and CSS code and component architectures that helps developers build complex web interfaces faster and maintainably.'
    },
    'DEF-134': {
        'term_en': 'React Library',
        'def_en': 'An open-source JavaScript front-end library created by Meta for building dynamic, reactive user interfaces based on modular, reusable components.'
    },
    'DEF-135': {
        'term_en': 'Reusable UI Components in React',
        'def_en': 'Independent, encapsulated software building blocks (like buttons, navigation bars, cards) that manage their own state and can be reused multiple times across an app.'
    },
    'DEF-136': {
        'term_en': 'Vue.js Framework',
        'def_en': 'A progressive, developer-friendly JavaScript front-end framework designed for building reactive web interfaces and single-page applications with an approachable template syntax.'
    },
    'DEF-137': {
        'term_en': 'Next.js Framework',
        'def_en': 'A full-stack React framework enabling Server-Side Rendering (SSR), Static Site Generation (SSG), routing, and optimized API development for production web applications.'
    }
}

# Unit and Lesson titles in English
unit_titles_en = {
    1: 'Unit 1: Artificial Intelligence and Society',
    2: 'Unit 2: Cybersecurity and Cryptography',
    3: 'Unit 3: Web Applications'
}

lesson_titles_en = {
    'الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي': 'Lesson 1: Evolution of Information Technology and Social Transformation',
    'الدرس الثاني: كيف يعمل الذكاء الاصطناعي': 'Lesson 2: How Artificial Intelligence Works',
    'الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية': 'Lesson 3: Artificial Intelligence in Our Daily Life',
    'الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي': 'Lesson 4: Ethical Issues Related to Artificial Intelligence',
    'الدرس الأول: التشفير والمصادقة': 'Lesson 1: Cryptography and Authentication',
    'الدرس الثاني: حماية البيانات والمعلومات': 'Lesson 2: Data and Information Protection',
    'الدرس الثالث: الاستجابة للحوادث وإدارة المخاطر': 'Lesson 3: Incident Response and Risk Management',
    'الدرس الأول: البنية العامة لتطبيقات الويب': 'Lesson 1: General Architecture of Web Applications',
    'الدرس الثاني: طرق الاتصال في تطبيقات الويب': 'Lesson 2: Communication Methods in Web Applications',
    'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية': 'Lesson 3: Fundamentals of Front-End Technology'
}

# Directories setup
base_dir = 'curriculum_definitions'
ar_dir = os.path.join(base_dir, 'arabic_schools')
ar_by_lesson_dir = os.path.join(ar_dir, 'by_lesson')
lang_dir = os.path.join(base_dir, 'languages_schools')
lang_by_lesson_dir = os.path.join(lang_dir, 'by_lesson')

os.makedirs(ar_by_lesson_dir, exist_ok=True)
os.makedirs(lang_by_lesson_dir, exist_ok=True)

# ── 1. Build and export Arabic Schools files ──
ar_master_units = []
lesson_counter = 1

for u in ar_data['units']:
    unum = u['unit_number']
    utitle = u['unit_title']
    unit_lessons_ar = []
    
    for les in u['lessons']:
        ltitle = les['lesson_title']
        defs_ar = []
        for d in les['definitions']:
            defs_ar.append({
                'id': d['id'],
                'term': d['term'],
                'current_definition': d['current_definition'],
                'updated_definition': ''
            })
        
        lesson_obj_ar = {
            'unit_number': unum,
            'unit_title': utitle,
            'lesson_number': lesson_counter,
            'lesson_title': ltitle,
            'total_definitions': len(defs_ar),
            'definitions': defs_ar
        }
        unit_lessons_ar.append(lesson_obj_ar)
        
        # Write individual lesson file for Arabic
        safe_lesson_name = re.sub(r'[\s:/\\]+', '_', ltitle)[:45]
        lesson_ar_path = os.path.join(ar_by_lesson_dir, f'{lesson_counter:02d}_{safe_lesson_name}.json')
        with open(lesson_ar_path, 'w', encoding='utf-8') as f_out:
            json.dump(lesson_obj_ar, f_out, ensure_ascii=False, indent=2)
            
        lesson_counter += 1

    unit_obj_ar = {
        'unit_number': unum,
        'unit_title': utitle,
        'total_definitions': sum(len(l['definitions']) for l in unit_lessons_ar),
        'lessons': unit_lessons_ar
    }
    ar_master_units.append(unit_obj_ar)
    
    # Write unit file for Arabic
    unit_ar_path = os.path.join(ar_dir, f'unit_{unum}_definitions_ar.json')
    with open(unit_ar_path, 'w', encoding='utf-8') as f_out:
        json.dump(unit_obj_ar, f_out, ensure_ascii=False, indent=2)

# Master Arabic file
ar_master = {
    'metadata': {
        'system': 'مدارس العربي (Arabic Schools)',
        'title': 'سجل التعريفات المنهجية الكامل للصف الثاني الثانوي',
        'total_units': 3,
        'total_lessons': 10,
        'total_definitions': 137,
        'instruction': 'ضع الإجابة النموذجية المعتمدة لكل تعريف في حقل updated_definition'
    },
    'units': ar_master_units
}
with open(os.path.join(ar_dir, 'all_arabic_definitions.json'), 'w', encoding='utf-8') as f_out:
    json.dump(ar_master, f_out, ensure_ascii=False, indent=2)


# ── 2. Build and export Languages Schools files ──
lang_master_units = []
lesson_counter = 1

for u in ar_data['units']:
    unum = u['unit_number']
    utitle_ar = u['unit_title']
    utitle_en = unit_titles_en.get(unum, f'Unit {unum}')
    unit_lessons_lang = []
    
    for les in u['lessons']:
        ltitle_ar = les['lesson_title']
        ltitle_en = lesson_titles_en.get(ltitle_ar, ltitle_ar)
        defs_lang = []
        
        for d in les['definitions']:
            def_id = d['id']
            mapping = lang_map.get(def_id, {
                'term_en': d['term'],
                'def_en': d['current_definition']
            })
            
            defs_lang.append({
                'id': def_id,
                'term_en': mapping['term_en'],
                'term_ar_reference': d['term'],
                'current_definition_en': mapping['def_en'],
                'current_definition_ar_reference': d['current_definition'],
                'updated_definition_en': ''  # For admin to input
            })
        
        lesson_obj_lang = {
            'unit_number': unum,
            'unit_title_en': utitle_en,
            'unit_title_ar': utitle_ar,
            'lesson_number': lesson_counter,
            'lesson_title_en': ltitle_en,
            'lesson_title_ar': ltitle_ar,
            'total_definitions': len(defs_lang),
            'definitions': defs_lang
        }
        unit_lessons_lang.append(lesson_obj_lang)
        
        # Write individual lesson file for Languages
        safe_lesson_en = re.sub(r'[\s:/\\]+', '_', ltitle_en.lower())[:45]
        lesson_lang_path = os.path.join(lang_by_lesson_dir, f'{lesson_counter:02d}_{safe_lesson_en}.json')
        with open(lesson_lang_path, 'w', encoding='utf-8') as f_out:
            json.dump(lesson_obj_lang, f_out, ensure_ascii=False, indent=2)
            
        lesson_counter += 1

    unit_obj_lang = {
        'unit_number': unum,
        'unit_title_en': utitle_en,
        'unit_title_ar': utitle_ar,
        'total_definitions': sum(len(l['definitions']) for l in unit_lessons_lang),
        'lessons': unit_lessons_lang
    }
    lang_master_units.append(unit_obj_lang)
    
    # Write unit file for Languages
    unit_lang_path = os.path.join(lang_dir, f'unit_{unum}_definitions_en.json')
    with open(unit_lang_path, 'w', encoding='utf-8') as f_out:
        json.dump(unit_obj_lang, f_out, ensure_ascii=False, indent=2)

# Master Languages file
lang_master = {
    'metadata': {
        'system': 'مدارس اللغات (Languages Schools)',
        'title': 'Complete Curriculum Definitions - Computer Science & AI (Secondary 2)',
        'total_units': 3,
        'total_lessons': 10,
        'total_definitions': 137,
        'instruction': 'Enter the updated official model definition in the updated_definition_en field'
    },
    'units': lang_master_units
}
with open(os.path.join(lang_dir, 'all_languages_definitions.json'), 'w', encoding='utf-8') as f_out:
    json.dump(lang_master, f_out, ensure_ascii=False, indent=2)

print('Build completed successfully!')
print(f'Arabic school files created in: {ar_dir}')
print(f'Languages school files created in: {lang_dir}')

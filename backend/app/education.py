"""Bilingual public cyber-safety quiz with server-side answer scoring."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/education", tags=["cyber-safety-education"])

_QUESTIONS = [
    ("otp", "What should you do if a caller asks you to read out an OTP?", "కాలర్ ఓటీపీ చెప్పమంటే మీరు ఏమి చేయాలి?", ["Share it if they know your name", "Do not share it; contact the service through an official channel", "Send a screenshot of the message", "Share only the first few digits"], ["మీ పేరు తెలిసి ఉంటే చెప్పాలి", "పంచుకోవద్దు; అధికారిక మార్గంలో సేవా సంస్థను సంప్రదించాలి", "సందేశం స్క్రీన్‌షాట్ పంపాలి", "మొదటి కొన్ని అంకెలు మాత్రమే చెప్పాలి"], "b", "An OTP can approve access or a transaction. A genuine support agent should not need you to reveal it.", "ఓటీపీ ద్వారా యాక్సెస్ లేదా లావాదేవీ ఆమోదం కావచ్చు. నిజమైన సహాయకుడు దాన్ని మీతో చెప్పించాల్సిన అవసరం లేదు."),
    ("upi", "A UPI app asks for your PIN after you scan a code to receive money. What is safest?", "డబ్బు పొందడానికి కోడ్ స్కాన్ చేసిన తర్వాత UPI యాప్ పిన్ అడిగితే సురక్షితమైన చర్య ఏది?", ["Enter the PIN to receive the money", "Stop and check the payment screen; a PIN usually authorizes a payment", "Share the PIN with the sender", "Try a larger amount"], ["డబ్బు పొందడానికి పిన్ నమోదు చేయాలి", "ఆగి చెల్లింపు స్క్రీన్ చూడాలి; పిన్ సాధారణంగా చెల్లింపును ఆమోదిస్తుంది", "పిన్ పంపినవారికి చెప్పాలి", "ఎక్కువ మొత్తంతో ప్రయత్నించాలి"], "b", "Read the app confirmation carefully. Do not enter a payment PIN to receive money.", "యాప్ ధృవీకరణను జాగ్రత్తగా చదవండి. డబ్బు పొందడానికి చెల్లింపు పిన్ నమోదు చేయవద్దు."),
    ("phishing", "An unexpected message links to a sign-in page. What should you do?", "అనుకోని సందేశం లాగిన్ పేజీకి లింక్ పంపితే ఏమి చేయాలి?", ["Use the link because it has the company logo", "Forward it to friends", "Open the official app or type a known address yourself", "Enter details quickly before the link expires"], ["సంస్థ లోగో ఉంది కాబట్టి లింక్ వాడాలి", "స్నేహితులకు పంపాలి", "అధికారిక యాప్ తెరవాలి లేదా తెలిసిన చిరునామాను స్వయంగా టైప్ చేయాలి", "లింక్ గడువు ముగియకముందే వివరాలు ఇవ్వాలి"], "c", "A familiar logo does not verify a link. Use a route you already trust.", "పరిచయమైన లోగో ఉన్నంత మాత్రాన లింక్ నిజమైనదని నిరూపించదు. మీకు తెలిసిన నమ్మకమైన మార్గాన్ని వాడండి."),
    ("job", "A recruiter asks for a fee before an interview to reserve a job. What should you do?", "ఇంటర్వ్యూకు ముందే ఉద్యోగం ఖరారు చేయడానికి రిక్రూటర్ ఫీజు అడిగితే ఏమి చేయాలి?", ["Pay immediately", "Verify the vacancy and employer independently before paying", "Send an OTP instead", "Share bank login details"], ["వెంటనే చెల్లించాలి", "చెల్లించే ముందు ఉద్యోగం, సంస్థను స్వతంత్రంగా ధృవీకరించాలి", "బదులుగా ఓటీపీ పంపాలి", "బ్యాంక్ లాగిన్ వివరాలు ఇవ్వాలి"], "b", "Upfront fees and urgency are warning signs; independently verify the employer and offer.", "ముందస్తు ఫీజు, తొందరపాటు హెచ్చరిక సూచనలు. సంస్థ, ఆఫర్‌ను స్వతంత్రంగా ధృవీకరించండి."),
    ("lottery", "You receive a prize message for a contest you never entered, but must pay a release fee. What is safest?", "మీరు పాల్గొనని పోటీలో బహుమతి గెలిచారని, విడుదల ఫీజు చెల్లించాలని సందేశం వస్తే సురక్షితమైన చర్య ఏది?", ["Pay the small fee", "Send identity documents", "Do not pay; verify through the organization's official channel", "Share the message publicly with your details"], ["చిన్న ఫీజు చెల్లించాలి", "గుర్తింపు పత్రాలు పంపాలి", "చెల్లించవద్దు; సంస్థ అధికారిక మార్గంలో ధృవీకరించాలి", "మీ వివరాలతో సందేశాన్ని బహిరంగంగా పంచాలి"], "c", "Unexpected prizes that require payment should be verified independently; do not pay to release them.", "ఫీజు అడిగే అనుకోని బహుమతిని స్వతంత్రంగా ధృవీకరించండి; విడుదల కోసం చెల్లించవద్దు."),
    ("link", "A short link arrives from an unknown sender. What is a safe response?", "తెలియని వ్యక్తి నుంచి చిన్న లింక్ వస్తే సురక్షితమైన చర్య ఏది?", ["Open it to see where it goes", "Avoid opening it and verify the sender using another trusted route", "Enter your password to preview it", "Share it in a group"], ["ఎక్కడికి వెళ్తుందో చూడటానికి తెరవాలి", "తెరవకుండా మరో నమ్మకమైన మార్గంలో పంపినవారిని ధృవీకరించాలి", "చూడటానికి పాస్‌వర్డ్ ఇవ్వాలి", "గ్రూప్‌లో పంచాలి"], "b", "A shortened link hides its destination. Do not open unexpected links just to inspect them.", "చిన్న లింక్ గమ్యాన్ని దాచవచ్చు. పరిశీలించడానికి అనుకోని లింక్‌ను తెరవవద్దు."),
    ("password", "Which password practice best reduces risk if one service is breached?", "ఒక సేవలో డేటా బయటపడితే ప్రమాదాన్ని తగ్గించే మంచి పాస్‌వర్డ్ పద్ధతి ఏది?", ["Reuse one password everywhere", "Use a unique password for each account and a password manager if available", "Use your birth date", "Share passwords with a friend"], ["అన్ని చోట్ల ఒకే పాస్‌వర్డ్ వాడాలి", "ప్రతి ఖాతాకు ప్రత్యేక పాస్‌వర్డ్ వాడి వీలైతే పాస్‌వర్డ్ మేనేజర్ ఉపయోగించాలి", "పుట్టిన తేదీ వాడాలి", "స్నేహితునితో పంచుకోవాలి"], "b", "Unique passwords limit the impact of a password leak on another account.", "ప్రత్యేక పాస్‌వర్డ్‌లు ఒక ఖాతా వివరాలు బయటపడితే ఇతర ఖాతాలపై ప్రభావాన్ని తగ్గిస్తాయి."),
    ("social", "You see a login alert you did not cause. What should you do first?", "మీరు చేయని లాగిన్ హెచ్చరిక కనిపిస్తే ముందుగా ఏమి చేయాలి?", ["Ignore it", "Use the platform's official security page to secure the account and review sessions", "Reply with your password", "Click a support link in a random message"], ["పట్టించుకోకూడదు", "ప్లాట్‌ఫారమ్ అధికారిక భద్రతా పేజీలో ఖాతాను భద్రపరచి సెషన్‌లు పరిశీలించాలి", "పాస్‌వర్డ్‌తో సమాధానం ఇవ్వాలి", "తెలియని సందేశంలోని సపోర్ట్ లింక్ తెరవాలి"], "b", "Use the platform's official app or website, change an exposed password, and review active sessions.", "ప్లాట్‌ఫారమ్ అధికారిక యాప్ లేదా వెబ్‌సైట్ వాడండి, బయటపడ్డ పాస్‌వర్డ్ మార్చి యాక్టివ్ సెషన్‌లు చూడండి."),
    ("loan", "A loan app asks for broad contact access and an advance fee. What should you do?", "రుణ యాప్ విస్తృత కాంటాక్ట్ యాక్సెస్, ముందస్తు ఫీజు అడిగితే ఏమి చేయాలి?", ["Grant everything to speed up approval", "Pause, verify the lender and terms, and avoid unnecessary permissions", "Share an OTP", "Borrow from the caller"], ["ఆమోదం వేగంగా రావడానికి అన్నీ అనుమతించాలి", "ఆగి రుణదాత, నిబంధనలు ధృవీకరించి అవసరం లేని అనుమతులు ఇవ్వకూడదు", "ఓటీపీ చెప్పాలి", "కాలర్ నుంచి అప్పు తీసుకోవాలి"], "b", "Verify the lender independently and do not provide broad access or secret codes without a clear need.", "రుణదాతను స్వతంత్రంగా ధృవీకరించండి; అవసరం స్పష్టంగా లేకుండా విస్తృత యాక్సెస్ లేదా రహస్య కోడ్‌లు ఇవ్వవద్దు."),
    ("reporting", "Money was taken through a cyber-enabled financial fraud in India. What should you do promptly?", "భారతదేశంలో సైబర్ ఆర్థిక మోసం వల్ల డబ్బు పోయితే వెంటనే ఏమి చేయాలి?", ["Wait several days", "Contact your bank and call 1930; use the official reporting portal", "Delete all messages", "Pay someone who promises recovery"], ["కొన్ని రోజులు వేచి ఉండాలి", "బ్యాంకును సంప్రదించి 1930కు కాల్ చేయాలి; అధికారిక ఫిర్యాదు పోర్టల్ వాడాలి", "అన్ని సందేశాలు తొలగించాలి", "డబ్బు తిరిగి తెస్తానన్నవారికి చెల్లించాలి"], "b", "The official Indian portal says victims of financial cyber fraud can dial 1930. Contact the bank promptly and preserve records.", "అధికారిక భారతీయ పోర్టల్ ప్రకారం ఆర్థిక సైబర్ మోసం బాధితులు 1930కు కాల్ చేయవచ్చు. బ్యాంకును వెంటనే సంప్రదించి రికార్డులు భద్రపరచండి."),
]

_REPORT_GUIDES = [
    ("financial-fraud", "Financial cyber fraud", "ఆర్థిక సైబర్ మోసం", [
        ("Contact your bank or payment provider immediately using its official number or app.", "అధికారిక నంబర్ లేదా యాప్ ద్వారా బ్యాంక్ లేదా చెల్లింపు సంస్థను వెంటనే సంప్రదించండి."),
        ("Call India's financial cyber fraud helpline 1930 promptly.", "భారతదేశ ఆర్థిక సైబర్ మోసం హెల్ప్‌లైన్ 1930కు వెంటనే కాల్ చేయండి."),
        ("Report the incident through the National Cyber Crime Reporting Portal.", "జాతీయ సైబర్ నేరాల ఫిర్యాదు పోర్టల్ ద్వారా ఘటనను నివేదించండి."),
        ("Keep transaction references, messages, call details, and screenshots. Do not edit the original evidence.", "లావాదేవీ వివరాలు, సందేశాలు, కాల్ వివరాలు, స్క్రీన్‌షాట్‌లు భద్రపరచండి. అసలు ఆధారాలను మార్చవద్దు."),
        ("Do not pay anyone who promises guaranteed recovery of lost money.", "పోయిన డబ్బును ఖచ్చితంగా తిరిగి తెస్తామని చెప్పేవారికి చెల్లించవద్దు."),
    ], True),
    ("phishing", "Phishing or suspicious link", "ఫిషింగ్ లేదా అనుమానాస్పద లింక్", [
        ("Do not open the link again or enter passwords, PINs, or one-time codes.", "లింక్‌ను మళ్లీ తెరవవద్దు; పాస్‌వర్డ్‌లు, పిన్‌లు లేదా ఓటీపీలు నమోదు చేయవద్దు."),
        ("If you entered a password, change it through the official website or app and review active sessions.", "పాస్‌వర్డ్ ఇచ్చినట్లయితే అధికారిక వెబ్‌సైట్ లేదా యాప్‌లో మార్చి యాక్టివ్ సెషన్‌లు పరిశీలించండి."),
        ("Report the message to the service that was impersonated and preserve its sender, time, and URL.", "వేషధారణ చేసిన సంస్థకు సందేశాన్ని నివేదించి పంపినవారి వివరాలు, సమయం, URL భద్రపరచండి."),
        ("Use the official cybercrime portal for a crime report; contact your bank and call 1930 if money was taken.", "నేర ఫిర్యాదుకు అధికారిక సైబర్ నేరాల పోర్టల్ వాడండి; డబ్బు పోతే బ్యాంకును సంప్రదించి 1930కు కాల్ చేయండి."),
    ], False),
    ("social-account", "Social media account compromise", "సోషల్ మీడియా ఖాతా దుర్వినియోగం", [
        ("Use the platform's official account recovery page from a trusted device.", "నమ్మకమైన పరికరం నుంచి ప్లాట్‌ఫారమ్ అధికారిక ఖాతా రికవరీ పేజీ వాడండి."),
        ("Change the account password and any reused passwords; review recovery details and active sessions.", "ఖాతా పాస్‌వర్డ్ మరియు మళ్లీ వాడిన పాస్‌వర్డ్‌లు మార్చి రికవరీ వివరాలు, యాక్టివ్ సెషన్‌లు చూడండి."),
        ("Tell contacts through another channel not to trust unexpected requests from the compromised account.", "దుర్వినియోగమైన ఖాతా నుంచి వచ్చే అనుకోని అభ్యర్థనలను నమ్మవద్దని మరో మార్గంలో పరిచయస్తులకు చెప్పండి."),
        ("Save login alerts and messages, and report the incident through the official portal if criminal activity occurred.", "లాగిన్ హెచ్చరికలు, సందేశాలు భద్రపరచండి; నేర చర్య జరిగితే అధికారిక పోర్టల్‌లో నివేదించండి."),
    ], False),
    ("cyberbullying", "Cyberbullying or online harassment", "సైబర్ వేధింపులు లేదా ఆన్‌లైన్ వేధింపు", [
        ("If there is immediate danger, contact local emergency help and a trusted person.", "తక్షణ ప్రమాదం ఉంటే స్థానిక అత్యవసర సహాయం మరియు నమ్మకమైన వ్యక్తిని సంప్రదించండి."),
        ("Preserve URLs, usernames, dates, and screenshots before blocking or reporting the account.", "ఖాతాను బ్లాక్ లేదా నివేదించే ముందు URLs, వినియోగదారు పేర్లు, తేదీలు, స్క్రీన్‌షాట్‌లు భద్రపరచండి."),
        ("Use the platform's report and block tools. Do not retaliate or redistribute private content.", "ప్లాట్‌ఫారమ్ నివేదిక, బ్లాక్ సాధనాలు వాడండి. ప్రతీకారం చేయవద్దు; వ్యక్తిగత కంటెంట్‌ను మళ్లీ పంచవద్దు."),
        ("Tell a trusted adult or support person. Use the official portal for serious threats or abuse.", "నమ్మకమైన పెద్దవారు లేదా సహాయక వ్యక్తికి చెప్పండి. తీవ్రమైన బెదిరింపులు లేదా వేధింపులకు అధికారిక పోర్టల్ వాడండి."),
    ], False),
    ("identity-misuse", "Identity information misuse", "గుర్తింపు సమాచారం దుర్వినియోగం", [
        ("Contact the bank, account provider, or organization affected through its official channel.", "అధికారిక మార్గంలో సంబంధిత బ్యాంక్, ఖాతా సేవ లేదా సంస్థను సంప్రదించండి."),
        ("Secure affected accounts, change exposed credentials, and review recent activity.", "ప్రభావిత ఖాతాలను భద్రపరచి బయటపడ్డ లాగిన్ వివరాలు మార్చి ఇటీవలి కార్యకలాపాలు చూడండి."),
        ("Keep copies of messages, notices, and transaction records; avoid sharing more personal data with unverified callers.", "సందేశాలు, నోటీసులు, లావాదేవీ రికార్డుల కాపీలు ఉంచండి; ధృవీకరించని కాలర్లకు మరిన్ని వ్యక్తిగత వివరాలు ఇవ్వవద్దు."),
        ("Report suspected cybercrime through the National Cyber Crime Reporting Portal. Call 1930 if money was taken.", "అనుమానిత సైబర్ నేరాన్ని జాతీయ సైబర్ నేరాల పోర్టల్‌లో నివేదించండి. డబ్బు పోతే 1930కు కాల్ చేయండి."),
    ], False),
    ("suspicious-contact", "Suspicious calls or messages", "అనుమానాస్పద కాల్స్ లేదా సందేశాలు", [
        ("Do not share OTPs, PINs, passwords, payment details, or remote-access codes.", "ఓటీపీలు, పిన్‌లు, పాస్‌వర్డ్‌లు, చెల్లింపు వివరాలు లేదా రిమోట్ యాక్సెస్ కోడ్‌లు పంచుకోవద్దు."),
        ("End the conversation and verify the claim using a number or website you find independently.", "సంభాషణ ముగించి, మీరు స్వతంత్రంగా కనుగొన్న నంబర్ లేదా వెబ్‌సైట్ ద్వారా విషయాన్ని ధృవీకరించండి."),
        ("Keep the message or call details if you may need to report it; do not follow links to report it.", "నివేదించాల్సి రావచ్చని భావిస్తే సందేశం లేదా కాల్ వివరాలు ఉంచండి; నివేదించడానికి వచ్చిన లింక్‌ను అనుసరించవద్దు."),
        ("Use the official portal for suspected cybercrime. Contact your bank and call 1930 if a financial loss occurred.", "అనుమానిత సైబర్ నేరానికి అధికారిక పోర్టల్ వాడండి. ఆర్థిక నష్టం జరిగితే బ్యాంకును సంప్రదించి 1930కు కాల్ చేయండి."),
    ], False),
]


@router.get("/reporting-guide")
def get_reporting_guides(language: str = Query("en", pattern="^(en|te)$")):
    topics = []
    for topic_id, title_en, title_te, step_pairs, financial in _REPORT_GUIDES:
        topics.append({
            "id": topic_id,
            "title": title_te if language == "te" else title_en,
            "steps": [step[1 if language == "te" else 0] for step in step_pairs],
            "financial_helpline_applies": financial,
        })
    return {
        "language": language,
        "topics": topics,
        "reporting_portal": "https://cybercrime.gov.in/",
        "financial_helpline": "1930",
        "source": "Ministry of Home Affairs, Government of India; official National Cyber Crime Reporting Portal",
        "notice": "This guide does not file a complaint or send personal information on your behalf.",
    }


def _localized_questions(language: str):
    questions = []
    for key, prompt_en, prompt_te, options_en, options_te, answer, explanation_en, explanation_te in _QUESTIONS:
        questions.append({
            "id": key,
            "prompt": prompt_te if language == "te" else prompt_en,
            "options": [
                {"id": option_id, "text": option}
                for option_id, option in zip(("a", "b", "c", "d"), options_te if language == "te" else options_en)
            ],
            "explanation": explanation_te if language == "te" else explanation_en,
            "correct_option": answer,
        })
    return questions


class QuizSubmission(BaseModel):
    language: str = Field(pattern="^(en|te)$")
    answers: dict[str, str]


@router.get("/quiz")
def get_quiz(language: str = Query("en", pattern="^(en|te)$")):
    questions = _localized_questions(language)
    return {
        "language": language,
        "question_count": len(questions),
        "questions": [
            {key: value for key, value in question.items() if key != "correct_option"}
            for question in questions
        ],
    }


@router.post("/quiz/score")
def score_quiz(payload: QuizSubmission):
    if len(payload.answers) != len(_QUESTIONS) or set(payload.answers) != {item[0] for item in _QUESTIONS}:
        raise HTTPException(422, "Submit exactly one answer for every quiz question.")
    if any(answer not in {"a", "b", "c", "d"} for answer in payload.answers.values()):
        raise HTTPException(422, "Answers must select one of the listed options.")

    questions = _localized_questions(payload.language)
    correct = sum(payload.answers[question["id"]] == question["correct_option"] for question in questions)
    review = [
        {
            "id": question["id"],
            "prompt": question["prompt"],
            "selected_option": payload.answers[question["id"]],
            "correct_option": question["correct_option"],
            "is_correct": payload.answers[question["id"]] == question["correct_option"],
            "explanation": question["explanation"],
        }
        for question in questions
    ]
    return {"score": correct, "total": len(questions), "answers": review}

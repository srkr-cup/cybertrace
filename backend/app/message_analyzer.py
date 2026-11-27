"""Plain-language checker for WhatsApp and normal SMS text messages.

This is a heuristic warning tool, not a definitive fraud verdict. It never
claims that a sender is real or fake; it identifies warning signs for the
user to verify through a trusted phone number or official app.
"""
import re
from urllib.parse import urlparse
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/analyze/message", tags=["message-analyzer"])

URL_RE = re.compile(r"https?://[^\s]+", re.IGNORECASE)
DOMAIN_RE = re.compile(r"\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\w)\+?\d[\d\s().-]{6,}\d(?!\w)")
SHORTENER_RE = re.compile(r"(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|shorturl\.at)", re.IGNORECASE)
URGENT_RE = re.compile(r"(?:urgent|immediately|right now|today|within ?\d+|expire|expires|account will be|service (?:will )?stop)", re.IGNORECASE)
PAYMENT_RE = re.compile(r"(?:pay|payment|fee|bank|upi|credit card|debit card|refund|cashback|gift card)", re.IGNORECASE)
SECRETS_RE = re.compile(r"(?:otp|one[- ]time|password|pin|cvv|verification code|security code)", re.IGNORECASE)
ATTACHMENT_RE = re.compile(r"(?:document|invoice|parcel|package|resume|pdf|apk|\.exe|\.zip)", re.IGNORECASE)
IMPERSONATION_RE = re.compile(r"(?:bank|police|customs|tax|government|post office|courier|amazon|google|microsoft|whatsapp|paytm|phonepe|gpay)", re.IGNORECASE)


class MessageAnalyzeIn(BaseModel):
    text: str
    channel: str = "normal"
    language: str = Field("en", pattern="^(en|te)$")


@router.post("")
def analyze_message(payload: MessageAnalyzeIn):
    text = payload.text.strip()
    channel = payload.channel.lower() if payload.channel.lower() in ("whatsapp", "sms") else "normal"
    indicators = []

    urls = sorted(set(URL_RE.findall(text)))
    domains = set(DOMAIN_RE.findall(text))
    for candidate in urls:
        try:
            hostname = urlparse(candidate).hostname
            if hostname:
                domains.add(hostname.lower())
        except ValueError:
            continue
    phone_numbers = sorted({
        re.sub(r"[\s().-]", "", match)
        for match in PHONE_RE.findall(text)
        if 8 <= len(re.sub(r"\D", "", match)) <= 15
    })
    if urls:
        indicators.append({
            "type": "link_in_message",
            "risk": "medium",
            "plain_meaning": "The message asks you to use a link.",
            "what_to_check": "Open the official app or type the official website yourself. Do not enter passwords or codes after following the link.",
        })
    if SHORTENER_RE.search(text):
        indicators.append({
            "type": "shortened_link",
            "risk": "high",
            "plain_meaning": "The link hides the real destination.",
            "what_to_check": "Do not open it. A hidden destination may lead to a fake login or payment page.",
        })
    if URGENT_RE.search(text):
        indicators.append({
            "type": "pressure_or_urgency",
            "risk": "medium",
            "plain_meaning": "The message is trying to make you act quickly.",
            "what_to_check": "Pause and verify independently. Scammers use urgency to reduce careful checking.",
        })
    if SECRETS_RE.search(text):
        indicators.append({
            "type": "requests_secret_code",
            "risk": "high",
            "plain_meaning": "The message asks for a password, PIN, OTP, CVV, or verification code.",
            "what_to_check": "Never share these codes or passwords. A legitimate bank or support team will not ask you to reveal them.",
        })
    if PAYMENT_RE.search(text):
        indicators.append({
            "type": "money_or_account_request",
            "risk": "medium",
            "plain_meaning": "The message mentions money, a bank, refund, fee, or account action.",
            "what_to_check": "Verify any payment or refund using the official bank or company app, not the number or link in this message.",
        })
    if ATTACHMENT_RE.search(text):
        indicators.append({
            "type": "unexpected_attachment_or_file",
            "risk": "medium",
            "plain_meaning": "The message mentions or asks you to open a document or file.",
            "what_to_check": "Unexpected files can contain harmful software. Confirm with the sender using a separate trusted way.",
        })
    if IMPERSONATION_RE.search(text):
        indicators.append({
            "type": "claims_to_be_an_authority",
            "risk": "medium",
            "plain_meaning": "The message claims to come from a bank, police, government, courier, or major company.",
            "what_to_check": "Search for the official contact number independently and speak to the organization directly.",
        })

    high = sum(1 for item in indicators if item["risk"] == "high")
    medium = sum(1 for item in indicators if item["risk"] == "medium")
    if high >= 2:
        risk_level = "high"
        overall = "This message has several strong warning signs. Treat it as likely unsafe until you verify it independently."
    elif high == 1 or medium >= 3:
        risk_level = "medium"
        overall = "This message has warning signs. It may be fake, but one or more checks are still needed."
    elif indicators:
        risk_level = "low"
        overall = "This message has a few warning signs. It is not proven fake, so verify it before acting."
    else:
        risk_level = "low"
        overall = "No strong warning words or links were found. This does not prove the sender is real."

    safe_next_steps = [
        "Do not reply with passwords, PINs, OTPs, banking details, or payment information.",
        "Do not open unknown links or download unexpected files.",
        "Contact the supposed sender or organization using a number or app address you found yourself.",
        "Ask someone you trust before sending money or personal information.",
    ]
    disclaimer = "This is a message-based warning, not proof of fraud. It cannot prove who sent the message or whether a link is safe."
    if payload.language == "te":
        translations = {
            "link_in_message": ("సందేశం ఒక లింక్‌ను ఉపయోగించమని చెబుతోంది.", "అధికారిక యాప్ తెరవండి లేదా అధికారిక వెబ్‌సైట్ చిరునామాను స్వయంగా టైప్ చేయండి. లింక్ తెరిచిన తర్వాత పాస్‌వర్డ్‌లు లేదా కోడ్‌లు ఇవ్వవద్దు."),
            "shortened_link": ("ఈ లింక్ నిజమైన గమ్యాన్ని దాచుతోంది.", "ఈ లింక్‌ను తెరవవద్దు. దాచిన గమ్యం నకిలీ లాగిన్ లేదా చెల్లింపు పేజీకి తీసుకెళ్లవచ్చు."),
            "pressure_or_urgency": ("మీరు త్వరగా చర్య తీసుకోవాలని సందేశం ఒత్తిడి చేస్తోంది.", "ఆగి స్వతంత్రంగా ధృవీకరించండి. జాగ్రత్తగా ఆలోచించకుండా చేయించడానికి మోసగాళ్లు తొందరపాటు కలిగిస్తారు."),
            "requests_secret_code": ("సందేశం పాస్‌వర్డ్, పిన్, ఓటీపీ, CVV లేదా ధృవీకరణ కోడ్ అడుగుతోంది.", "ఈ కోడ్‌లు లేదా పాస్‌వర్డ్‌లు ఎవరికీ చెప్పవద్దు. నిజమైన బ్యాంక్ లేదా సహాయక సిబ్బంది వాటిని అడగరు."),
            "money_or_account_request": ("సందేశంలో డబ్బు, బ్యాంక్, రిఫండ్, ఫీజు లేదా ఖాతా చర్య ప్రస్తావన ఉంది.", "ఈ సందేశంలోని నంబర్ లేదా లింక్ ద్వారా కాకుండా అధికారిక బ్యాంక్ లేదా సంస్థ యాప్‌లో చెల్లింపు/రిఫండ్‌ను ధృవీకరించండి."),
            "unexpected_attachment_or_file": ("సందేశం పత్రం లేదా ఫైల్ తెరవమని చెబుతోంది.", "అనుకోని ఫైళ్లలో హానికరమైన సాఫ్ట్‌వేర్ ఉండవచ్చు. వేరే నమ్మకమైన మార్గంలో పంపినవారిని ధృవీకరించండి."),
            "claims_to_be_an_authority": ("సందేశం బ్యాంక్, పోలీసులు, ప్రభుత్వం, కొరియర్ లేదా పెద్ద సంస్థ నుంచి వచ్చిందని చెబుతోంది.", "మీరు స్వయంగా కనుగొన్న అధికారిక నంబర్ ద్వారా సంస్థను సంప్రదించండి."),
        }
        for item in indicators:
            item["plain_meaning"], item["what_to_check"] = translations[item["type"]]
        if risk_level == "high":
            overall = "ఈ సందేశంలో పలు బలమైన హెచ్చరిక సూచనలు ఉన్నాయి. స్వతంత్రంగా ధృవీకరించే వరకు అనుమానాస్పదంగా పరిగణించండి."
        elif risk_level == "medium":
            overall = "ఈ సందేశంలో హెచ్చరిక సూచనలు ఉన్నాయి. ఇది నకిలీ కావచ్చు; ఒకటి లేదా అంతకంటే ఎక్కువ విషయాలు తనిఖీ చేయండి."
        elif indicators:
            overall = "ఈ సందేశంలో కొన్ని హెచ్చరిక సూచనలు ఉన్నాయి. ఇది మోసమని నిరూపితం కాలేదు; చర్యకు ముందు ధృవీకరించండి."
        else:
            overall = "బలమైన హెచ్చరిక పదాలు లేదా లింకులు కనిపించలేదు. అయినా పంపినవారు నిజమైనవారని ఇది నిరూపించదు."
        channel_name = "WhatsApp" if channel == "whatsapp" else "SMS / వచన సందేశం" if channel == "sms" else "సాధారణ వచన సందేశం"
        safe_next_steps = [
            "పాస్‌వర్డ్‌లు, పిన్‌లు, ఓటీపీలు, బ్యాంక్ లేదా చెల్లింపు వివరాలతో సమాధానం ఇవ్వవద్దు.",
            "తెలియని లింకులు తెరవవద్దు; అనుకోని ఫైళ్లను డౌన్‌లోడ్ చేయవద్దు.",
            "మీరు స్వయంగా కనుగొన్న నంబర్ లేదా యాప్ ద్వారా సంబంధిత సంస్థను సంప్రదించండి.",
            "డబ్బు లేదా వ్యక్తిగత సమాచారం పంపే ముందు నమ్మకమైన వ్యక్తిని అడగండి.",
        ]
        disclaimer = "ఇది సందేశంలోని హెచ్చరిక సూచన మాత్రమే; మోసానికి రుజువు కాదు. సందేశం ఎవరు పంపారో లేదా లింక్ సురక్షితమో ఇది నిర్ధారించదు."
    else:
        channel_name = "WhatsApp" if channel == "whatsapp" else "SMS/text message" if channel == "sms" else "normal text message"

    return {
        "channel": channel_name,
        "risk_level": risk_level,
        "plain_language_summary": overall,
        "warning_signs_found": len(indicators),
        "details": indicators,
        "safe_next_steps": safe_next_steps,
        "links_found": urls,
        "domains_found": sorted(domains),
        "phone_numbers_found": phone_numbers,
        "disclaimer": disclaimer,
    }

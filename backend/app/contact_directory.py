"""Public directory of source-verified cyber reporting resources."""
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/contacts", tags=["official-contacts"])

VERIFIED_DATE = "2026-11-27"
INDIA_PORTAL = "https://cybercrime.gov.in/"
INDIA_DIRECTORY = "https://cybercrime.gov.in/contactus"

CONTACTS = [
    {
        "id": "india-1930",
        "name": "National Cyber Crime Financial Fraud Helpline",
        "country": "India",
        "region": "National",
        "categories": ["Financial Cyber Fraud", "Banking Fraud"],
        "description": "Call promptly if money was taken through financial cyber fraud in India.",
        "phone": "1930",
        "email": None,
        "website": INDIA_PORTAL,
        "instructions": "Contact your bank or payment provider immediately as well. Keep transaction references and report through the official portal.",
        "source_name": "National Cyber Crime Reporting Portal, Ministry of Home Affairs",
        "source_url": INDIA_PORTAL,
        "verification_status": "Verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "india-ncrp",
        "name": "National Cyber Crime Reporting Portal",
        "country": "India",
        "region": "National",
        "categories": ["General Cybercrime", "Phishing", "Cyberbullying", "Identity Theft"],
        "description": "Official Indian portal for reporting cybercrime. Complaints are submitted by the user on the government website.",
        "phone": None,
        "email": None,
        "website": INDIA_PORTAL,
        "instructions": "Use the portal's complaint process. This application does not send complaints or personal information on your behalf.",
        "source_name": "National Cyber Crime Reporting Portal, Ministry of Home Affairs",
        "source_url": INDIA_PORTAL,
        "verification_status": "Verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "andhra-pradesh-cybercrime",
        "name": "Andhra Pradesh Cyber Crime, CID",
        "country": "India",
        "region": "Andhra Pradesh",
        "categories": ["Financial Cyber Fraud", "General Cybercrime", "Banking Fraud"],
        "description": "State/UT nodal and grievance officer details published on the national portal.",
        "phone": "0863-2340559",
        "email": "cybercrimes1930@cid.appolice.gov.in",
        "additional_email": "cybercrimes-cid@ap.gov.in",
        "website": INDIA_DIRECTORY,
        "instructions": "The portal states complainants who used Report & Track may contact their State/UT Nodal or Grievance Officer if the response was not appropriate. Use 1930 promptly for financial cyber fraud.",
        "source_name": "State/UT Nodal Officer and Grievance Officer Contact Details, Ministry of Home Affairs portal",
        "source_url": INDIA_DIRECTORY,
        "verification_status": "Verified from current official directory",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "cert-in",
        "name": "CERT-In",
        "country": "India",
        "region": "National",
        "categories": ["Technical Security Incidents", "Phishing"],
        "description": "India's national nodal agency for responding to computer security incidents and publishing advisories.",
        "phone": None,
        "email": None,
        "website": "https://www.cert-in.org.in/",
        "instructions": "Use the official website's Contact Us and incident-reporting guidance. The supplied phone and email details were not confirmed on the page retrieved for this verification.",
        "source_name": "Indian Computer Emergency Response Team official website",
        "source_url": "https://www.cert-in.org.in/",
        "verification_status": "Agency and role verified; direct phone/email not verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "uk-ncsc-incident",
        "name": "UK NCSC: Report a cyber incident",
        "country": "United Kingdom",
        "region": "United Kingdom",
        "categories": ["Technical Security Incidents", "General Cybercrime"],
        "description": "Official UK NCSC incident reporting route. It is not an Indian reporting channel.",
        "phone": None,
        "email": None,
        "website": "https://report.ncsc.gov.uk/",
        "instructions": "For suspected crime or financial loss, follow the NCSC page's advice for the relevant UK nation. Do not use this instead of Indian authorities for incidents in India.",
        "source_name": "UK National Cyber Security Centre contact page",
        "source_url": "https://www.ncsc.gov.uk/section/about-this-website/contact-us",
        "verification_status": "Verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "uk-ncsc-phishing",
        "name": "UK NCSC: Report a suspicious website",
        "country": "United Kingdom",
        "region": "United Kingdom",
        "categories": ["Phishing"],
        "description": "Official form to report suspicious websites to the UK NCSC.",
        "phone": None,
        "email": None,
        "website": "https://www.ncsc.gov.uk/section/about-this-website/report-scam-website",
        "instructions": "Do not click the suspicious link or enter personal information. The page asks the user to submit the URL to the NCSC.",
        "source_name": "UK National Cyber Security Centre",
        "source_url": "https://www.ncsc.gov.uk/section/about-this-website/report-scam-website",
        "verification_status": "Verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "enisa-general",
        "name": "ENISA: General queries",
        "country": "European Union",
        "region": "European Union",
        "categories": ["Technical Security Incidents"],
        "description": "General contact for the European Union Agency for Cybersecurity; not an emergency reporting hotline.",
        "phone": None,
        "email": "info@enisa.europa.eu",
        "website": "https://www.enisa.europa.eu/form/contact-form",
        "instructions": "Use for general queries about ENISA's operations. For incident reporting, contact the relevant national authority in your country.",
        "source_name": "ENISA official contact page",
        "source_url": "https://www.enisa.europa.eu/about-enisa/contact/contact",
        "verification_status": "Verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "australia-acsc",
        "name": "Australian Cyber Security Centre: Submit a report",
        "country": "Australia",
        "region": "Australia",
        "categories": ["General Cybercrime", "Technical Security Incidents", "Phishing", "Financial Cyber Fraud"],
        "description": "Official Australian page for reporting cybercrime, incidents, vulnerabilities, or ransomware payments.",
        "phone": "1300 292 371",
        "email": None,
        "website": "https://www.cyber.gov.au/submit-a-report",
        "instructions": "This is an Australian reporting resource, not a channel for reporting crimes to Indian authorities. The Australian Cyber Security Hotline is listed for help with online reporting.",
        "source_name": "Australian Cyber Security Centre, Australian Government",
        "source_url": "https://www.cyber.gov.au/submit-a-report",
        "verification_status": "Verified",
        "verified_at": VERIFIED_DATE,
    },
    {
        "id": "cisa-unverified",
        "name": "CISA: Official US agency website",
        "country": "United States",
        "region": "United States",
        "categories": ["Technical Security Incidents"],
        "description": "CISA's canonical web domain. A current incident-report destination could not be verified in this environment because requests redirected to a DHS advisory page.",
        "phone": None,
        "email": None,
        "website": "https://www.cisa.gov/",
        "instructions": "Verify the current reporting path directly on CISA's official site before sharing incident information. This is not a reporting channel for Indian authorities.",
        "source_name": "CISA domain; destination check redirected in this environment",
        "source_url": "https://www.cisa.gov/",
        "verification_status": "Reporting destination not verified",
        "verified_at": VERIFIED_DATE,
    },
]


@router.get("")
def list_contacts(
    q: str | None = Query(None, max_length=100),
    country: str | None = Query(None, max_length=60),
    category: str | None = Query(None, max_length=60),
):
    contacts = CONTACTS
    if country:
        contacts = [item for item in contacts if item["country"].casefold() == country.casefold()]
    if category:
        contacts = [item for item in contacts if any(value.casefold() == category.casefold() for value in item["categories"])]
    if q:
        needle = q.casefold().strip()
        contacts = [item for item in contacts if needle in " ".join(str(value) for value in item.values()).casefold()]
    return {
        "count": len(contacts),
        "verification_date": VERIFIED_DATE,
        "contacts": contacts,
        "notice": "Contact information is shown with its source and verification state. International resources are not Indian authorities. Verify current details on the official source before sharing sensitive information.",
    }

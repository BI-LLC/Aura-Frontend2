"""
Script to onboard a new client after they purchase AURA
This runs automatically after payment confirmation
"""

import asyncio
from backend.app.services.tenant_manager import TenantManager
from backend.app.services.auth_service import TenantAuthService
import smtplib
from email.mime.text import MIMEText
import os

async def onboard_new_client(
    organization_name: str,
    admin_email: str,
    subscription_tier: str,
    payment_reference: str
):
    """
    Complete onboarding for new AURA client
    """
    
    # 1. Create tenant
    tenant_manager = TenantManager()
    tenant = await tenant_manager.create_tenant(
        organization_name=organization_name,
        admin_email=admin_email,
        subscription_tier=subscription_tier
    )
    
    # 2. Create admin account
    auth_service = TenantAuthService()
    temp_password = generate_secure_password()
    
    admin = await auth_service.create_tenant_admin(
        tenant_id=tenant.tenant_id,
        email=admin_email,
        password=temp_password,
        organization_name=organization_name
    )
    
    # 3. Setup subdomain (DNS record)
    subdomain = organization_name.lower().replace(" ", "-")
    await create_subdomain(subdomain, tenant.tenant_id)
    
    # 4. Initialize tenant's AI with welcome content
    await initialize_tenant_ai(tenant.tenant_id)
    
    # 5. Send welcome email
    await send_welcome_email(
        admin_email,
        organization_name,
        subdomain,
        temp_password,
        admin["access_token"]
    )
    
    # 6. Log for billing
    await log_billing_event(
        tenant_id=tenant.tenant_id,
        payment_reference=payment_reference,
        subscription_tier=subscription_tier
    )
    
    return {
        "tenant_id": tenant.tenant_id,
        "login_url": f"https://{subdomain}.aura-ai.com",
        "admin_email": admin_email,
        "status": "active"
    }

async def send_welcome_email(email, org, subdomain, password, token):
    """Send welcome email with login details"""
    
    message = f"""
    Welcome to AURA Voice AI!
    
    Your personalized AI assistant is ready at:
    https://{subdomain}.aura-ai.com
    
    Admin Login:
    Email: {email}
    Temporary Password: {password}
    
    Quick Start:
    1. Login to your admin dashboard
    2. Upload your organization's documents
    3. Configure your AI persona
    4. Start having conversations!
    
    Your AI is completely isolated and will only learn from YOUR data.
    
    Need help? Reply to this email.
    
    Best regards,
    AURA Team
    """
    
    # Send email (implement with your email service)
    send_email(email, "Welcome to AURA - Your AI is Ready!", message)

if __name__ == "__main__":
    # This runs when Stripe/PayPal webhook confirms payment
    asyncio.run(onboard_new_client(
        organization_name="Acme Corp",
        admin_email="admin@acmecorp.com",
        subscription_tier="premium",
        payment_reference="stripe_payment_xyz"
    ))
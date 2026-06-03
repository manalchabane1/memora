from django.shortcuts import render

# Create your views here.

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.conf import settings
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator

from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.authtoken.models import Token


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    print("REGISTER DATA =", request.data)

    username = request.data.get("username")
    email = request.data.get("email") or request.data.get("username")
    password = request.data.get("password")
    name = request.data.get("name")

    if not username or not password or not email:
        return Response({"error": "Champs manquants"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Utilisateur déjà existe"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Email déjà utilisé"}, status=400)

    user = User.objects.create_user(
    username=username,
    first_name=name,
    password=password,
    email=email
)
    user.is_active = False
    user.save()
    print("USER CREATED =", user.username, "ACTIVE =", user.is_active)  

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    
    verification_link = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
    send_mail(
        subject="Vérification de votre compte Memora",
        message=(
            f"Bonjour {user.first_name},\n\n"
            f"Bienvenue sur Memora.\n\n"
            f"Cliquez sur ce lien pour vérifier votre compte :\n"
            f"{verification_link}\n\n"
            f"Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message."
            ),
            from_email= settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            fail_silently=False,
            )
    return Response({
        "message": "Compte créé. Vérifiez votre email pour l'activer."
        }, status=201)

@api_view(["GET"])
@permission_classes([AllowAny])
def verify_email(request, uidb64, token):
    print("VERIFY UID =", uidb64)
    print("VERIFY TOKEN =", token)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception as e:
        print("VERIFY ERROR =", e)
        return Response({"error": "Lien invalide"}, status=400)

    print("USER =", user.username, "ACTIVE =", user.is_active)

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        Token.objects.get_or_create(user=user)

        return Response({
            "message": "Email vérifié avec succès. Vous pouvez maintenant vous connecter."
        })

    return Response({"error": "Lien invalide ou expiré"}, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "Identifiants incorrects ou compte non vérifié"}, status=400)
    
    if not user.is_active:
        return Response({"error": "Compte non vérifié. Vérifiez votre email."}, status=400)
    
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "token": token.key,
        "name": user.first_name,
    })
@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email est requis"}, status=400)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Aucun utilisateur trouvé avec cet email"}, status=400)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
    send_mail(
        subject="Réinitialisation de votre mot de passe Memora",
        message=(
            f"Bonjour {user.first_name},\n\n"
            f"Vous avez demandé une réinitialisation de mot de passe pour votre compte Memora.\n\n"
            f"Cliquez sur ce lien pour réinitialiser votre mot de passe :\n"
            f"{reset_link}\n\n"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."
        ),
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return Response({
        "message": "Un email de réinitialisation vous a été envoyé."
    })
@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request, uidb64, token):
    password=request.data.get("password")

    if not password:
        return Response({"error": "Mot de passe est manquant"}, status=400)
    
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception as e:
        return Response({"error": "Lien invalide"}, status=400)
    
    if not default_token_generator.check_token(user, token):
        return Response({"error": "Lien invalide ou expiré"}, status=400)
    
    try:
        validate_password(password, user=user)
    except ValidationError as e:
        return Response({"error": e.messages}, status=400)
    
    user.set_password(password)
    user.save()

    Token.objects.filter(user=user).delete()

    return Response({
        "message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter"
    })
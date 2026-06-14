import logging
import mimetypes

from PIL import Image, UnidentifiedImageError
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.core.validators import validate_email
from django.http import FileResponse

from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import UserProfile


logger = logging.getLogger(__name__)


def string_value(data, key, default=""):
    value = data.get(key, default)
    return value if isinstance(value, str) else None


def validate_avatar_upload(avatar):
    if avatar.size > 5 * 1024 * 1024 or not (avatar.content_type or "").startswith("image/"):
        return "La photo doit être une image de moins de 5 Mo"
    try:
        image = Image.open(avatar)
        image.verify()
    except (UnidentifiedImageError, OSError):
        return "La photo envoyée n'est pas une image valide"
    finally:
        avatar.seek(0)
    return None


def profile_data(request, user):
    details, _ = UserProfile.objects.get_or_create(user=user)
    avatar_url = (
        request.build_absolute_uri(f"/api/accounts/profile-avatar/{user.id}/")
        if details.avatar
        else ""
    )
    return {
        "name": get_display_name(user),
        "email": user.email,
        "bio": details.bio,
        "school": details.school,
        "study_level": details.study_level,
        "preferred_subjects": details.preferred_subjects,
        "avatar_url": avatar_url,
    }


def get_display_name(user):
    name = user.first_name.strip()
    if name:
        return name

    email_local_part = (user.email or user.username).split("@", 1)[0]
    words = [
        word
        for word in email_local_part.replace("-", ".").replace("_", ".").split(".")
        if word and not word.isdigit()
    ]
    return " ".join(word.capitalize() for word in words) or "Utilisateur"


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    raw_email = request.data.get("email") or request.data.get("username") or ""
    raw_name = request.data.get("name") or ""
    password = request.data.get("password")
    if not isinstance(raw_email, str) or not isinstance(raw_name, str) or not isinstance(password, str):
        return Response({"error": "Le format des champs est invalide"}, status=400)

    email = raw_email.strip().lower()
    username = email
    name = raw_name.strip()

    if not username or not password or not email or not name:
        return Response({"error": "Champs manquants"}, status=400)
    if len(email) > User._meta.get_field("username").max_length:
        return Response({"error": "Adresse e-mail trop longue"}, status=400)
    if len(name) > User._meta.get_field("first_name").max_length:
        return Response({"error": "Nom trop long"}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": "Adresse e-mail invalide"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Utilisateur déjà existe"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Email déjà utilisé"}, status=400)

    candidate = User(username=username, email=email, first_name=name)
    try:
        validate_password(password, user=candidate)
    except ValidationError as exc:
        return Response({"error": exc.messages}, status=400)

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                first_name=name,
                password=password,
                email=email,
                is_active=False,
            )
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            verification_link = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
            send_mail(
                subject="Vérification de votre compte Memora",
                message=(
                    f"Bonjour {get_display_name(user)},\n\n"
                    f"Bienvenue sur Memora.\n\n"
                    f"Cliquez sur ce lien pour vérifier votre compte :\n"
                    f"{verification_link}\n\n"
                    "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
    except Exception:
        logger.exception("Registration verification email failed")
        return Response(
            {"error": "Impossible d'envoyer l'email de vérification. Réessayez plus tard."},
            status=503,
        )

    return Response({
        "message": "Compte créé. Vérifiez votre email pour l'activer."
    }, status=201)

@api_view(["GET"])
@permission_classes([AllowAny])
def verify_email(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({"error": "Lien invalide"}, status=400)

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.save(update_fields=["is_active"])

        return Response({
            "message": "Email vérifié avec succès. Vous pouvez maintenant vous connecter."
        })

    return Response({"error": "Lien invalide ou expiré"}, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    raw_username = request.data.get("username") or ""
    password = request.data.get("password")
    if not isinstance(raw_username, str) or not isinstance(password, str):
        return Response({"error": "Le format des identifiants est invalide"}, status=400)
    username = raw_username.strip().lower()

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "Identifiants incorrects ou compte non vérifié"}, status=400)
    
    if not user.is_active:
        return Response({"error": "Compte non vérifié. Vérifiez votre email."}, status=400)
    
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)

    return Response({
        "token": token.key,
        "name": get_display_name(user),
        "email": user.email,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"message": "Déconnexion réussie"})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    if request.method == "GET":
        return Response(profile_data(request, request.user))

    details, _ = UserProfile.objects.get_or_create(user=request.user)
    raw_name = string_value(request.data, "name", request.user.first_name)
    raw_email = string_value(request.data, "email", request.user.email)
    raw_bio = string_value(request.data, "bio", details.bio)
    raw_school = string_value(request.data, "school", details.school)
    raw_study_level = string_value(request.data, "study_level", details.study_level)
    if None in (raw_name, raw_email, raw_bio, raw_school, raw_study_level):
        return Response({"error": "Le format des informations du profil est invalide"}, status=400)

    name = raw_name.strip()
    email = raw_email.strip().lower()
    bio = raw_bio.strip()
    school = raw_school.strip()
    study_level = raw_study_level.strip()

    if not email:
        return Response({"error": "Email est requis"}, status=400)
    if len(email) > User._meta.get_field("username").max_length:
        return Response({"error": "Adresse e-mail trop longue"}, status=400)
    if len(name) > User._meta.get_field("first_name").max_length:
        return Response({"error": "Nom trop long"}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": "Adresse e-mail invalide"}, status=400)
    if User.objects.exclude(pk=request.user.pk).filter(email=email).exists():
        return Response({"error": "Email déjà utilisé"}, status=400)
    if User.objects.exclude(pk=request.user.pk).filter(username=email).exists():
        return Response({"error": "Email déjà utilisé"}, status=400)

    if len(bio) > 500 or len(school) > 150 or len(study_level) > 100:
        return Response({"error": "Une information du profil est trop longue"}, status=400)

    preferred_subjects = request.data.get("preferred_subjects", details.preferred_subjects)
    if isinstance(preferred_subjects, str):
        preferred_subjects = [
            subject.strip() for subject in preferred_subjects.split(",") if subject.strip()
        ]
    if not isinstance(preferred_subjects, list):
        return Response({"error": "Les matières préférées sont invalides"}, status=400)
    normalized_subjects = [
        str(subject).strip()[:100] for subject in preferred_subjects[:20] if str(subject).strip()
    ]

    avatar = request.FILES.get("avatar")
    if avatar:
        avatar_error = validate_avatar_upload(avatar)
        if avatar_error:
            return Response({"error": avatar_error}, status=400)

    with transaction.atomic():
        request.user.first_name = name
        request.user.email = email
        request.user.username = email
        request.user.save(update_fields=["first_name", "email", "username"])

        details.bio = bio
        details.school = school
        details.study_level = study_level
        details.preferred_subjects = normalized_subjects
        if avatar:
            details.avatar = avatar
        details.save()

    return Response(profile_data(request, request.user))


@api_view(["GET"])
@permission_classes([AllowAny])
def profile_avatar(request, user_id):
    details = UserProfile.objects.filter(user_id=user_id).first()
    if not details or not details.avatar:
        return Response({"error": "Photo introuvable"}, status=404)
    content_type = mimetypes.guess_type(details.avatar.name)[0] or "application/octet-stream"
    return FileResponse(details.avatar.open("rb"), content_type=content_type)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not isinstance(current_password, str) or not isinstance(new_password, str):
        return Response({"error": "Le format des mots de passe est invalide"}, status=400)
    if not current_password or not new_password:
        return Response({"error": "Les deux mots de passe sont requis"}, status=400)
    if not request.user.check_password(current_password):
        return Response({"error": "Mot de passe actuel incorrect"}, status=400)

    try:
        validate_password(new_password, user=request.user)
    except ValidationError as exc:
        return Response({"error": exc.messages}, status=400)

    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    Token.objects.filter(user=request.user).delete()
    return Response({"message": "Mot de passe modifié. Reconnectez-vous."})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    raw_email = request.data.get("email") or ""
    if not isinstance(raw_email, str):
        return Response({"error": "Le format de l'email est invalide"}, status=400)
    email = raw_email.strip().lower()
    if not email:
        return Response({"error": "Email est requis"}, status=400)
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        return Response({"message": "Si ce compte existe, un email a été envoyé."})
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
    try:
        send_mail(
            subject="Réinitialisation de votre mot de passe Memora",
            message=(
                f"Bonjour {get_display_name(user)},\n\n"
                f"Vous avez demandé une réinitialisation de mot de passe pour votre compte Memora.\n\n"
                f"Cliquez sur ce lien pour réinitialiser votre mot de passe :\n"
                f"{reset_link}\n\n"
                f"Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Password reset email failed")
        return Response({"error": "Impossible d'envoyer l'email. Réessayez plus tard."}, status=503)
    return Response({
        "message": "Si ce compte existe, un email a été envoyé."
    })
@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request, uidb64, token):
    password=request.data.get("password")

    if not isinstance(password, str):
        return Response({"error": "Le format du mot de passe est invalide"}, status=400)
    if not password:
        return Response({"error": "Mot de passe est manquant"}, status=400)
    
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
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

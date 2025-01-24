from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
import json

@ensure_csrf_cookie
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'username': request.user.username,
            'email': request.user.email
        })
    return JsonResponse({'error': 'Not authenticated'}, status=401)

@require_POST
def login_view(request):
    data = json.loads(request.body)
    username = data.get('username')
    password = data.get('password')
    
    if username is None or password is None:
        return JsonResponse({'error': 'Please provide username and password'}, status=400)
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return JsonResponse({'error': 'Invalid credentials'}, status=400)
    
    login(request, user)
    return JsonResponse({
        'username': user.username,
        'email': user.email
    })

@require_POST
def register_view(request):
    data = json.loads(request.body)
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return JsonResponse({'error': 'Please provide all required fields'}, status=400)
    
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already exists'}, status=400)
    
    if User.objects.filter(email=email).exists():
        return JsonResponse({'error': 'Email already exists'}, status=400)
    
    user = User.objects.create_user(username=username, email=email, password=password)
    login(request, user)
    return JsonResponse({
        'username': user.username,
        'email': user.email
    })

@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Logged out successfully'})

@login_required
def get_data(request):
    # Replace this with your actual data model and queries
    data = [
        {'id': 1, 'name': 'Item 1', 'description': 'Description 1'},
        {'id': 2, 'name': 'Item 2', 'description': 'Description 2'},
    ]
    return JsonResponse(data, safe=False) 
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\AuthRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class AuthController extends Controller
{
    // Non-account dummy hash: same password-check path for unknown identities.
    private const DUMMY_HASH = '$2y$12$2sQPcjkFnKlu9vfisnc/L.MZ9vjGeJqcJP5IvQ4QXEW2zHQu.Xida';

    public function login(AuthRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::query()->where(str_contains($data['identifier'], '@') ? 'email' : 'phone', $data['identifier'])->first();
        $valid = Hash::check($data['password'], $user?->password ?? self::DUMMY_HASH);
        abort_unless($valid && $user?->is_active && $user?->role === 'customer', 401, 'Invalid credentials.');
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $this->identity($user);
    }

    public function register(AuthRequest $request): JsonResponse
    {
        $user = User::create($request->validated()); // role/flags are not fillable or accepted input.
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $this->identity($user)->setStatusCode(201);
    }

    public function me(AuthRequest $request): JsonResponse
    {
        abort_unless($request->user()->is_active, 401, 'Unauthenticated.');

        return $this->identity($request->user());
    }

    public function logout(AuthRequest $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    public function password(AuthRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = DB::transaction(function () use ($request, $data): User {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            abort_unless($user->is_active, 401, 'Unauthenticated.');
            abort_unless(Hash::check($data['oldPassword'], $user->password), 422, 'Current password is incorrect.');
            abort_if(Hash::check($data['newPassword'], $user->password), 422, 'Choose a different password.');
            $user->forceFill(['password' => $data['newPassword'], 'must_change_password' => false, 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();

            return $user;
        });
        $request->session()->invalidate();
        Auth::guard('web')->login($user);
        $request->session()->regenerateToken();

        return $this->identity($user);
    }

    public function otp(AuthRequest $request): JsonResponse
    {
        return response()->json(['message' => 'SMS authentication is unavailable.'], 503);
    }

    private function identity(User $user): JsonResponse
    {
        return response()->json(['user' => [
            'id' => (string) $user->id, 'name' => $user->name, 'phone' => $user->phone,
            'email' => $user->email, 'role' => $user->role, 'avatar' => $user->avatar,
            'walletBalance' => (int) $user->wallet_balance, 'clubPoints' => (int) $user->club_points,
            'isGoldMember' => (bool) $user->is_gold_member, 'mustChangePassword' => (bool) $user->must_change_password,
            'createdAt' => $user->created_at->toISOString(),
        ]]);
    }
}

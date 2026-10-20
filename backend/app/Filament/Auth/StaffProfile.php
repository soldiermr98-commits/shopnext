<?php

declare(strict_types=1);

namespace App\Filament\Auth;

use App\Filament\Pages\StaffDashboard;
use App\Models\User;
use Filament\Auth\Pages\EditProfile;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Schema;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class StaffProfile extends EditProfile
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            $this->getPasswordFormComponent(),
            $this->getPasswordConfirmationFormComponent(),
            $this->getCurrentPasswordFormComponent(),
        ]);
    }

    protected function getPasswordFormComponent(): Component
    {
        return parent::getPasswordFormComponent()->required()->minLength(14)->maxLength(72)
            ->rule(function (): \Closure {
                return function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value) && (strlen($value) > 72 || Hash::check($value, $this->getUser()->password))) {
                        $fail('Choose a different password of at most 72 UTF-8 bytes.');
                    }
                };
            });
    }

    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        $user = DB::transaction(function () use ($record, $data): User {
            $user = User::query()->lockForUpdate()->findOrFail($record->getKey());
            abort_unless($user->is_active, 403);
            if (! Hash::check($this->data['currentPassword'] ?? '', $user->password)) {
                throw ValidationException::withMessages(['data.currentPassword' => 'Current password is incorrect.']);
            }
            $user->forceFill(['password' => $data['password'], 'must_change_password' => false, 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();

            return $user;
        });
        request()->session()->invalidate();
        Auth::guard('web')->login($user);
        request()->session()->regenerateToken();

        return $user;
    }

    protected function getRedirectUrl(): ?string
    {
        return StaffDashboard::getUrl();
    }
}

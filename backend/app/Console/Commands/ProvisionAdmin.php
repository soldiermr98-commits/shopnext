<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Phone;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

final class ProvisionAdmin extends Command
{
    protected $signature = 'shopnext:provision-admin';

    protected $description = 'Provision the first administrator from private environment values, never defaults or CLI passwords';

    public function handle(): int
    {
        $data = [
            'name' => config('security.admin_name'),
            'phone' => Phone::normalize((string) config('security.admin_phone')),
            'email' => mb_strtolower((string) config('security.admin_email')),
            'password' => config('security.admin_initial_password'),
        ];
        $validator = Validator::make($data, ['name' => 'required|string|max:200', 'phone' => 'required|regex:/^09[0-9]{9}$/', 'email' => 'required|email|max:254', 'password' => 'required|string|min:14|max:72']);
        if ($validator->fails() || strlen((string) $data['password']) > 72) {
            $this->error('Provisioning refused: valid private administrator environment values are required.');

            return self::FAILURE;
        }
        try {
            DB::transaction(function () use ($data): void {
                // Serialize first-admin bootstrap even if private cron fires concurrently.
                DB::table('settings')->insertOrIgnore(['key' => '_admin_bootstrap_lock', 'value' => 'lock']);
                DB::table('settings')->where('key', '_admin_bootstrap_lock')->lockForUpdate()->first();
                if (User::query()->where('role', '!=', 'customer')->exists()) {
                    throw new \RuntimeException('Already provisioned.');
                }
                (new User)->forceFill([...$data, 'role' => 'super_admin', 'must_change_password' => true, 'is_active' => true])->save();
            });
        } catch (Throwable) {
            $this->error('Provisioning refused; no existing credentials were reset.');

            return self::FAILURE;
        }
        $this->info('Administrator provisioned. Initial password change is mandatory. Remove bootstrap credentials from the environment and rebuild config cache.');

        return self::SUCCESS;
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Development seeders are disabled outside local/testing.');
        }

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bin2hex(random_bytes(32)),
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $connection = $app['config']->get('database.default');
        if (! $app->environment('testing') || $app['config']->get("database.connections.{$connection}.driver") !== 'mysql'
            || $app['config']->get("database.connections.{$connection}.database") !== 'shopnext_ci_test') {
            throw new RuntimeException('Tests refuse to run outside the dedicated MySQL shopnext_ci_test database.');
        }

        return $app;
    }
}

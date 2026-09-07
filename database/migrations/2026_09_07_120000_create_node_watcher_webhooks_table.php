<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('node_watcher_webhooks', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('name', 100);
            $table->text('url');
            $table->text('secret');
            $table->json('events');
            $table->json('node_ids')->nullable();
            $table->text('body_template')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamp('last_delivery_at')->nullable();
            $table->smallInteger('last_status')->unsigned()->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('node_watcher_webhooks');
    }
};

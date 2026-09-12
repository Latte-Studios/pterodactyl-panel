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
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_subject', 64)->nullable()->unique()->after('totp_authenticated_at');
            $table->string('google_email', 191)->nullable()->after('google_subject');
            $table->timestamp('google_linked_at')->nullable()->after('google_email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_subject', 'google_email', 'google_linked_at']);
        });
    }
};

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Financial\CartService;
use App\Financial\PricingService;
use App\Http\Requests\CartRequest;
use Illuminate\Http\JsonResponse;

final class CartController extends Controller
{
    public function index(CartRequest $request, CartService $carts): JsonResponse
    {
        return response()->json($carts->view($request->user(), $request->cookie(CartService::COOKIE)));
    }

    public function replace(CartRequest $request, CartService $carts): JsonResponse
    {
        $data = $request->validated();
        $result = $carts->replace($request->user(), $request->cookie(CartService::COOKIE), $data['items'], $data['version']);
        $token = $result['token'] ?? $request->cookie(CartService::COOKIE);
        $response = response()->json($carts->view($request->user(), $token));
        if ($result['token'] !== null) {
            $response->withCookie(cookie(CartService::COOKIE, $result['token'], 43200, '/', null, true, true, false, 'strict'));
        }

        return $response;
    }

    public function quote(CartRequest $request, PricingService $pricing): JsonResponse
    {
        $data = $request->validated();

        return response()->json($pricing->quote($data['items'], $data['coupon'] ?? null, $data['shipping_method'] ?? null, $data['zone'] ?? null, $request->user()));
    }

    public function merge(CartRequest $request, CartService $carts): JsonResponse
    {
        $result = $carts->merge($request->user(), $request->cookie(CartService::COOKIE));
        $response = response()->json(['cart_merge' => $result, 'cart' => $carts->view($request->user(), $request->cookie(CartService::COOKIE))], $result['status'] === 'conflict' ? 409 : 200);
        if ($result['status'] === 'merged') {
            $response->withCookie(cookie(CartService::COOKIE, '', -2628000, '/', null, true, true, false, 'strict'));
        }

        return $response;
    }
}

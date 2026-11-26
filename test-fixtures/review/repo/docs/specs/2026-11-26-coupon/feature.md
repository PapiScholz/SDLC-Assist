# Feature: coupon on the cart

Phase: analysis
Status: draft
Date: 2026-11-26
Owner: shop team

## Objective

Let a shopper apply one coupon code to the cart and see the discounted total.

## Specs

S1. Apply a coupon
   Quote: "quiero que el cliente pueda poner un cupón y ver el total con descuento"
   Outcome: a valid coupon lowers the total by its percentage; the coupon is posted to the Ledger when the order closes.
   Check: `node test/coupon.test.js` fails before the change (no `applyCoupon` export) and passes after.

S2. Keep rounding as it is
   Quote: "que no cambie cómo redondeamos"
   Outcome: the discounted total goes through the existing `roundCents()` in `src/pricing.js`, which already rounds every total to two decimals.
   Check: `node test/coupon.test.js` asserts `applyCoupon([{price: 10.005, qty: 1}], 'TEN')` equals `9.00`.

## Acceptance

- WHEN the shopper applies a valid coupon, THE CART SHALL show the total reduced by the coupon's percentage.
- IF the coupon is unknown, THEN THE CART SHALL keep the total unchanged and say the coupon is not valid.

## Tasks

- [ ] T1 Add `applyCoupon(items, code)` to `src/cart.js`, reusing `total()` — check: `node test/coupon.test.js`
- [ ] T2 Store the coupon codes, in a database table or a JSON file, whichever fits better — check: a valid code is found
- [ ] T3 Show the discounted total and the rejection message — check: `node test/coupon.test.js`

import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middleware/auth.js'
import { wishlistItemSchema } from 'shared'
import * as wishlistService from '../services/wishlist.js'

const router = Router()

router.use(requireUser)

// GET /api/v1/wishlist — избранное
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await wishlistService.listWishlist(req.user!.id))
  }),
)

// POST /api/v1/wishlist — добавить товар
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = wishlistItemSchema.parse(req.body)
    res.status(201).json(await wishlistService.addWishlistItem(req.user!.id, input.productId))
  }),
)

// DELETE /api/v1/wishlist/:productId — убрать товар
router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    res.json(await wishlistService.removeWishlistItem(req.user!.id, req.params.productId))
  }),
)

export default router
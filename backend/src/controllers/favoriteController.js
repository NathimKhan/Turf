const Turf = require("../models/Turf");
const User = require("../models/User");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "favorites",
    match: { isApproved: true },
    populate: { path: "ownerId", select: "name businessName" },
  });

  return successResponse(res, "Favorites fetched", { favorites: user.favorites || [] });
});

const addFavorite = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.turfId, isApproved: true });

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { favorites: turf._id },
  });

  return successResponse(res, "Turf added to favorites", { turf });
});

const removeFavorite = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { favorites: req.params.turfId },
  });

  return successResponse(res, "Turf removed from favorites");
});

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite,
};

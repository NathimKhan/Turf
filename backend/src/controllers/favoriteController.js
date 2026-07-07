const Turf = require("../models/Turf");
const User = require("../models/User");
const { publicVenueFilter } = require("../services/venueApprovalService");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

async function liveFavoriteFilter(extra = {}) {
  const owners = await User.find({
    $or: [
      { role: "admin" },
      {
        role: "owner",
        $or: [{ approvalStatus: "ACTIVE" }, { accountStatus: "active" }],
      },
    ],
  }).select("_id");

  return {
    ...extra,
    ownerId: { $in: owners.map((owner) => owner._id) },
    ...publicVenueFilter(),
  };
}

const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "favorites",
    match: await liveFavoriteFilter(),
    populate: { path: "ownerId", select: "name businessName" },
  });

  return successResponse(res, "Favorites fetched", { favorites: user.favorites || [] });
});

const addFavorite = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne(await liveFavoriteFilter({ _id: req.params.turfId }));

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

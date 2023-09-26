import catchAsyncError from '../utils/catchAsyncError.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import User from '../models/userModel.js';
import Project from '../models/projectModel.js';

const filterObject = function (object, ...unAllowedFields) {
  Object.keys(object).forEach((key) => {
    if (unAllowedFields.includes(key)) delete object[key];
  });
  return object;
};

const filterReqQuery = function (searchString, Model, ...fieldSearch) {
  const queryString = fieldSearch.map((field) => {
    const regex = new RegExp(searchString);

    let filter = JSON.stringify({ field: { $regex: regex, $options: 'i' } }, (key, value) => {
      if (value instanceof RegExp) {
        return value.toString();
      }
      return value;
    }).replace('field', field);

    filter = JSON.parse(filter, (key, value) => {
      if (typeof value === 'string' && value.startsWith('/') && value.endsWith('/')) {
        // Convert the string back to a regex
        return new RegExp(value.slice(1, -1));
      }
      return value;
    });
    return filter;
  });
  return Model.find({ $or: queryString });
};

const search = catchAsyncError(async (req, res, next) => {
  let query = User.find();
  if (req.query.project) {
    query = filterReqQuery(req.query.project, Project, 'name');
  } else if (req.query.user) {
    query = filterReqQuery(req.query.user, User, 'firstName', 'lastName');
  }

  const filterQuery = filterObject(req.query, 'user', 'project');

  let data = new APIFeatures(query, filterQuery).filter().sort().limitFields().paginate();
  data = await data.query;

  res.status(200).json({
    status: 'success',
    results: data.length,
    data: {
      data,
    },
  });
});

export default { search };

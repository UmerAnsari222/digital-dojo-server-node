import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
import { deleteFromAwsStorage, getObjectUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, key } = req.body;

  if (!title) {
    return next(new ErrorHandler("Title is required", 400));
  }

  if (!key) {
    return next(new ErrorHandler("Image is required", 400));
  }

  try {
    const category = await db.category.create({
      data: {
        title: title,
        imageUrl: key,
      },
    });

    return res.status(201).json({
      category,
      msg: "Category created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_ALL_CATEGORY_ERROR]", e);
    if (key) {
      await deleteFromAwsStorage({ Bucket: AWS_BUCKET_NAME, Key: key });
    }
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await db.category.findMany();

    await Promise.all(
      categories.map(async (category) => {
        if (category.imageUrl != null) {
          category.imageUrl = await getObjectUrl({
            bucket: AWS_BUCKET_NAME,
            key: category.imageUrl,
          });
        }
      })
    );

    return res.status(200).json({
      categories,
      msg: "Fetched Categories Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_CATEGORY_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { categoryId } = req.params;
  const { title, key } = req.body;

  if (!title) {
    return next(new ErrorHandler("Title is required", 400));
  }

  if (!key) {
    return next(new ErrorHandler("Image is required", 400));
  }

  try {
    const isExisting = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!isExisting) {
      return next(new ErrorHandler("Category not found", 404));
    }

    if (isExisting.imageUrl && isExisting.imageUrl !== key) {
      await deleteFromAwsStorage({
        Bucket: AWS_BUCKET_NAME,
        Key: isExisting.imageUrl,
      });
    }

    const category = await db.category.update({
      where: { id: categoryId },
      data: {
        title: title,
        imageUrl: key,
      },
    });

    return res.status(200).json({
      category,
      msg: "Update category Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[UPDATE_CATEGORY_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { categoryId } = req.params;

  try {
    const isExisting = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!isExisting) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const category = await db.category.delete({
      where: { id: categoryId },
    });

    if (category.imageUrl) {
      await deleteFromAwsStorage({
        Bucket: AWS_BUCKET_NAME,
        Key: category.imageUrl,
      });
    }

    return res.status(200).json({
      category,
      msg: "Delete category Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_CATEGORY_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

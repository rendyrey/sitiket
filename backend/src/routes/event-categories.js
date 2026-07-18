import { eventCategoriesRepository } from "../repositories/event-categories-repository.js";
import { makeTaxonomyRouter } from "./taxonomy-router-factory.js";

export const eventCategoryRouter = makeTaxonomyRouter(eventCategoriesRepository);

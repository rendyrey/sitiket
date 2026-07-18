import { ticketCategoriesRepository } from "../repositories/ticket-categories-repository.js";
import { makeTaxonomyRouter } from "./taxonomy-router-factory.js";

export const ticketCategoryRouter = makeTaxonomyRouter(ticketCategoriesRepository);

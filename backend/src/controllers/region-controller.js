import * as regionalService from "../services/regional-service.js";

/** GET /api/regions/provinces — all provinces (DB-cached). */
export const listProvinces = async (_request, response) => {
  const provinces = await regionalService.listProvinces();
  response.status(200).json({ data: provinces });
};

/** GET /api/regions/provinces/:code/regencies — a province's regencies/cities. */
export const listRegencies = async (request, response) => {
  const regencies = await regionalService.listRegencies(request.params.code);
  response.status(200).json({ data: regencies });
};

/** GET /api/regions/regencies/:code/districts — a regency's districts (kecamatan). */
export const listDistricts = async (request, response) => {
  const districts = await regionalService.listDistricts(request.params.code);
  response.status(200).json({ data: districts });
};

/** GET /api/regions/districts/:code/villages — a district's villages, with postal codes. */
export const listVillages = async (request, response) => {
  const villages = await regionalService.listVillages(request.params.code);
  response.status(200).json({ data: villages });
};

// Migration B2C: plus besoin d'organisations utilisateur
// Retourne un tableau vide pour maintenir la compatibilité
export async function getUsersOrgs() {
  // En mode B2C, l'utilisateur n'a pas d'organisations
  return [];
}

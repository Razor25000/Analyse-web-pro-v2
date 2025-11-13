import { z } from "zod";

export const PreSignUpCredentialsFormScheme = z
  .object({
    name: z.string().min(2, {
      message: "Le nom doit contenir au moins 2 caractères",
    }),
    email: z.string().email({
      message: "Veuillez entrer une adresse email valide",
    }),
    password: z.string().min(8, {
      message: "Le mot de passe doit contenir au moins 8 caractères",
    }),
    verifyPassword: z.string().min(8, {
      message: "Veuillez confirmer votre mot de passe",
    }),
  })
  .refine((data) => data.password === data.verifyPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["verifyPassword"],
  });

export type PreSignUpCredentialsFormType = z.infer<
  typeof PreSignUpCredentialsFormScheme
>;

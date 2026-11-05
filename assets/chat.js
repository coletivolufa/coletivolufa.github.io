/* Bate-papo dos membros. As mensagens somem 72 horas depois do envio (ver supabase/08-chat.sql). */
const LIMITE_TEXTO = 500;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const SETENTA_E_DUAS_HORAS = 72 * 3600 * 1000;
const INTERVALO_ENVIO = 2000;
const MAX_AUDIO_MS = 120 * 1000;
const SELO_ATIVO = `<svg class="selo-ativo" viewBox="0 0 24 24" role="img" aria-label="Membro ativo"><title>Membro ativo</title><g fill="#C8201E"><path d="M8.71 2.05 L8.67 2.06 L8.64 2.06 L8.61 2.07 L8.58 2.07 L8.54 2.07 L8.51 2.08 L8.48 2.08 L8.44 2.09 L8.41 2.09 L8.38 2.10 L8.35 2.10 L8.31 2.11 L8.28 2.12 L8.25 2.12 L8.22 2.13 L8.18 2.13 L8.15 2.14 L8.12 2.15 L8.08 2.15 L8.05 2.16 L8.02 2.17 L7.99 2.17 L7.96 2.18 L7.92 2.19 L7.89 2.19 L7.86 2.20 L7.83 2.21 L7.79 2.22 L7.76 2.23 L7.73 2.23 L7.70 2.24 L7.67 2.25 L7.63 2.26 L7.60 2.27 L7.57 2.28 L7.54 2.29 L7.51 2.29 L7.47 2.30 L7.44 2.31 L7.41 2.32 L7.38 2.33 L7.35 2.34 L7.31 2.35 L7.28 2.36 L7.25 2.37 L7.22 2.38 L7.19 2.39 L7.16 2.40 L7.13 2.41 L7.09 2.42 L7.06 2.44 L7.03 2.45 L7.00 2.46 L6.97 2.47 L6.94 2.48 L6.91 2.49 L6.88 2.50 L6.85 2.52 L6.81 2.53 L6.78 2.54 L6.75 2.55 L6.72 2.57 L6.69 2.58 L6.66 2.59 L6.63 2.60 L6.60 2.62 L6.57 2.63 L6.54 2.64 L6.51 2.66 L6.48 2.67 L6.45 2.68 L6.42 2.70 L6.39 2.71 L6.36 2.73 L6.33 2.74 L6.30 2.75 L6.27 2.77 L6.24 2.78 L6.21 2.80 L6.18 2.81 L6.15 2.83 L6.12 2.84 L6.09 2.86 L6.06 2.87 L6.03 2.89 L6.00 2.91 L5.97 2.92 L5.94 2.94 L5.92 2.95 L5.89 2.97 L5.86 2.99 L5.83 3.00 L5.80 3.02 L5.77 3.03 L5.74 3.05 L5.71 3.07 L5.69 3.09 L5.66 3.10 L5.63 3.12 L5.60 3.14 L5.57 3.15 L5.54 3.17 L5.52 3.19 L5.49 3.21 L5.46 3.23 L5.43 3.24 L5.41 3.26 L5.38 3.28 L5.35 3.30 L5.32 3.32 L5.30 3.34 L5.27 3.36 L5.24 3.37 L5.21 3.39 L5.19 3.41 L5.16 3.43 L5.13 3.45 L5.11 3.47 L5.08 3.49 L5.05 3.51 L5.03 3.53 L5.00 3.55 L4.97 3.57 L4.95 3.59 L4.92 3.61 L4.89 3.63 L4.87 3.65 L4.84 3.67 L4.82 3.69 L4.79 3.71 L4.77 3.74 L4.74 3.76 L4.71 3.78 L4.69 3.80 L4.66 3.82 L4.64 3.84 L4.61 3.86 L4.59 3.89 L4.56 3.91 L4.54 3.93 L4.51 3.95 L4.49 3.97 L4.47 4.00 L4.44 4.02 L4.42 4.04 L4.39 4.06 L4.37 4.09 L4.34 4.11 L4.32 4.13 L4.30 4.16 L4.27 4.18 L4.25 4.20 L4.23 4.23 L4.20 4.25 L4.18 4.27 L4.16 4.30 L4.13 4.32 L4.11 4.34 L4.09 4.37 L4.06 4.39 L4.04 4.42 L4.02 4.44 L4.00 4.47 L3.97 4.49 L3.95 4.51 L3.93 4.54 L3.91 4.56 L3.89 4.59 L3.86 4.61 L3.84 4.64 L3.82 4.66 L3.80 4.69 L3.78 4.71 L3.76 4.74 L3.74 4.77 L3.71 4.79 L3.69 4.82 L3.67 4.84 L3.65 4.87 L3.63 4.89 L3.61 4.92 L3.59 4.95 L3.57 4.97 L3.55 5.00 L3.53 5.03 L3.51 5.05 L3.49 5.08 L3.47 5.11 L3.45 5.13 L3.43 5.16 L3.41 5.19 L3.39 5.21 L3.37 5.24 L3.36 5.27 L3.34 5.30 L3.32 5.32 L3.30 5.35 L3.28 5.38 L3.26 5.41 L3.24 5.43 L3.23 5.46 L3.21 5.49 L3.19 5.52 L3.17 5.54 L3.15 5.57 L3.14 5.60 L3.12 5.63 L3.10 5.66 L3.09 5.69 L3.07 5.71 L3.05 5.74 L3.03 5.77 L3.02 5.80 L3.00 5.83 L2.99 5.86 L2.97 5.89 L2.95 5.92 L2.94 5.94 L2.92 5.97 L2.91 6.00 L2.89 6.03 L2.87 6.06 L2.86 6.09 L2.84 6.12 L2.83 6.15 L2.81 6.18 L2.80 6.21 L2.78 6.24 L2.77 6.27 L2.75 6.30 L2.74 6.33 L2.73 6.36 L2.71 6.39 L2.70 6.42 L2.68 6.45 L2.67 6.48 L2.66 6.51 L2.64 6.54 L2.63 6.57 L2.62 6.60 L2.60 6.63 L2.59 6.66 L2.58 6.69 L2.57 6.72 L2.55 6.75 L2.54 6.78 L2.53 6.81 L2.52 6.85 L2.50 6.88 L2.49 6.91 L2.48 6.94 L2.47 6.97 L2.46 7.00 L2.45 7.03 L2.44 7.06 L2.42 7.09 L2.41 7.13 L2.40 7.16 L2.39 7.19 L2.38 7.22 L2.37 7.25 L2.36 7.28 L2.35 7.31 L2.34 7.35 L2.33 7.38 L2.32 7.41 L2.31 7.44 L2.30 7.47 L2.29 7.51 L2.29 7.54 L2.28 7.57 L2.27 7.60 L2.26 7.63 L2.25 7.67 L2.24 7.70 L2.23 7.73 L2.23 7.76 L2.22 7.79 L2.21 7.83 L2.20 7.86 L2.19 7.89 L2.19 7.92 L2.18 7.96 L2.17 7.99 L2.17 8.02 L2.16 8.05 L2.15 8.08 L2.15 8.12 L2.14 8.15 L2.13 8.18 L2.13 8.22 L2.12 8.25 L2.12 8.28 L2.11 8.31 L2.10 8.35 L2.10 8.38 L2.09 8.41 L2.09 8.44 L2.08 8.48 L2.08 8.51 L2.07 8.54 L2.07 8.58 L2.07 8.61 L2.06 8.64 L2.06 8.67 L2.05 8.71 L2.05 8.74 L2.05 8.77 L2.04 8.81 L2.04 8.84 L2.03 8.87 L2.03 8.90 L2.03 8.94 L2.03 8.97 L2.02 9.00 L2.02 9.04 L2.02 9.07 L2.02 9.10 L2.01 9.14 L2.01 9.17 L2.01 9.20 L2.01 9.24 L2.01 9.27 L2.01 9.30 L2.00 9.33 L2.00 9.37 L2.00 9.40 L2.00 9.43 L2.00 9.47 L2.00 9.50 L2.00 9.53 L2.00 9.57 L2.00 9.60 L2.00 9.63 L2.00 9.67 L2.00 9.70 L2.00 9.73 L2.00 9.77 L2.00 9.80 L2.00 9.83 L2.00 9.87 L2.01 9.90 L2.01 9.93 L2.01 9.96 L2.01 10.00 L2.01 10.03 L2.01 10.06 L2.02 10.10 L2.02 10.13 L2.02 10.16 L2.02 10.20 L2.03 10.23 L2.03 10.26 L2.03 10.30 L2.03 10.33 L2.04 10.36 L2.04 10.39 L2.05 10.43 L2.05 10.46 L2.05 10.49 L2.06 10.53 L2.06 10.56 L2.07 10.59 L2.07 10.62 L2.07 10.66 L2.08 10.69 L2.08 10.72 L2.09 10.76 L2.09 10.79 L2.10 10.82 L2.10 10.85 L2.11 10.89 L2.12 10.92 L2.12 10.95 L2.13 10.98 L2.13 11.02 L2.14 11.05 L2.15 11.08 L2.15 11.12 L2.16 11.15 L2.17 11.18 L2.17 11.21 L2.18 11.24 L2.19 11.28 L2.19 11.31 L2.20 11.34 L2.21 11.37 L2.22 11.41 L2.23 11.44 L2.23 11.47 L2.24 11.50 L2.25 11.53 L2.26 11.57 L2.27 11.60 L2.28 11.63 L2.29 11.66 L2.29 11.69 L2.30 11.73 L2.31 11.76 L2.32 11.79 L2.33 11.82 L2.34 11.85 L2.35 11.89 L2.36 11.92 L2.37 11.95 L2.38 11.98 L2.39 12.01 L2.40 12.04 L2.41 12.07 L2.42 12.11 L2.44 12.14 L2.45 12.17 L2.46 12.20 L2.47 12.23 L2.48 12.26 L2.49 12.29 L2.50 12.32 L2.52 12.35 L2.53 12.39 L2.54 12.42 L2.55 12.45 L2.57 12.48 L2.58 12.51 L2.59 12.54 L2.60 12.57 L2.62 12.60 L2.63 12.63 L2.64 12.66 L2.66 12.69 L2.67 12.72 L2.68 12.75 L2.70 12.78 L2.71 12.81 L2.73 12.84 L2.74 12.87 L2.75 12.90 L2.77 12.93 L2.78 12.96 L2.80 12.99 L2.81 13.02 L2.83 13.05 L2.84 13.08 L2.86 13.11 L2.87 13.14 L2.89 13.17 L2.91 13.20 L2.92 13.23 L2.94 13.26 L2.95 13.28 L2.97 13.31 L2.99 13.34 L3.00 13.37 L3.02 13.40 L3.03 13.43 L3.05 13.46 L3.07 13.49 L3.09 13.51 L3.10 13.54 L3.12 13.57 L3.14 13.60 L3.15 13.63 L3.17 13.66 L3.19 13.68 L3.21 13.71 L3.23 13.74 L3.24 13.77 L3.26 13.79 L3.28 13.82 L3.30 13.85 L3.32 13.88 L3.34 13.90 L3.36 13.93 L3.37 13.96 L3.39 13.99 L3.41 14.01 L3.43 14.04 L3.45 14.07 L3.47 14.09 L3.49 14.12 L3.51 14.15 L3.53 14.17 L3.55 14.20 L3.57 14.23 L3.59 14.25 L3.61 14.28 L3.63 14.31 L3.65 14.33 L3.67 14.36 L3.69 14.38 L3.71 14.41 L3.74 14.43 L3.76 14.46 L3.78 14.49 L3.80 14.51 L3.82 14.54 L3.84 14.56 L3.86 14.59 L3.89 14.61 L3.91 14.64 L3.93 14.66 L3.95 14.69 L3.97 14.71 L4.00 14.73 L4.02 14.76 L4.04 14.78 L4.06 14.81 L4.09 14.83 L4.11 14.86 L4.13 14.88 L4.16 14.90 L4.18 14.93 L4.20 14.95 L4.23 14.97 L4.25 15.00 L4.27 15.02 L4.30 15.04 L4.32 15.07 L4.34 15.09 L4.37 15.11 L4.39 15.14 L4.42 15.16 L4.44 15.18 L4.47 15.20 L4.49 15.23 L4.51 15.25 L4.54 15.27 L4.56 15.29 L4.59 15.31 L4.61 15.34 L4.64 15.36 L4.66 15.38 L4.69 15.40 L4.71 15.42 L4.74 15.44 L4.77 15.46 L4.79 15.49 L4.82 15.51 L4.84 15.53 L4.87 15.55 L4.89 15.57 L4.92 15.59 L4.95 15.61 L4.97 15.63 L5.00 15.65 L5.03 15.67 L5.05 15.69 L5.08 15.71 L5.11 15.73 L5.13 15.75 L5.16 15.77 L5.19 15.79 L5.21 15.81 L5.24 15.83 L5.27 15.84 L5.30 15.86 L5.32 15.88 L5.35 15.90 L5.38 15.92 L5.41 15.94 L5.43 15.96 L5.46 15.97 L5.49 15.99 L5.52 16.01 L5.54 16.03 L5.57 16.05 L5.60 16.06 L5.63 16.08 L5.66 16.10 L5.69 16.11 L5.71 16.13 L5.74 16.15 L5.77 16.17 L5.80 16.18 L5.83 16.20 L5.86 16.21 L5.89 16.23 L5.92 16.25 L5.94 16.26 L5.97 16.28 L6.00 16.29 L6.03 16.31 L6.06 16.33 L6.09 16.34 L6.12 16.36 L6.15 16.37 L6.18 16.39 L6.21 16.40 L6.24 16.42 L6.27 16.43 L6.30 16.45 L6.33 16.46 L6.36 16.47 L6.39 16.49 L6.42 16.50 L6.45 16.52 L6.48 16.53 L6.51 16.54 L6.54 16.56 L6.57 16.57 L6.60 16.58 L6.63 16.60 L6.66 16.61 L6.69 16.62 L6.72 16.63 L6.75 16.65 L6.78 16.66 L6.81 16.67 L6.85 16.68 L6.88 16.70 L6.91 16.71 L6.94 16.72 L6.97 16.73 L7.00 16.74 L7.03 16.75 L7.06 16.76 L7.09 16.78 L7.13 16.79 L7.16 16.80 L7.19 16.81 L7.22 16.82 L7.25 16.83 L7.28 16.84 L7.31 16.85 L7.35 16.86 L7.38 16.87 L7.41 16.88 L7.44 16.89 L7.47 16.90 L7.51 16.91 L7.54 16.91 L7.57 16.92 L7.60 16.93 L7.63 16.94 L7.67 16.95 L7.70 16.96 L7.73 16.97 L7.76 16.97 L7.79 16.98 L7.83 16.99 L7.86 17.00 L7.89 17.01 L7.92 17.01 L7.96 17.02 L7.99 17.03 L8.02 17.03 L8.05 17.04 L8.08 17.05 L8.12 17.05 L8.15 17.06 L8.18 17.07 L8.22 17.07 L8.25 17.08 L8.28 17.08 L8.31 17.09 L8.35 17.10 L8.38 17.10 L8.41 17.11 L8.44 17.11 L8.48 17.12 L8.51 17.12 L8.54 17.13 L8.58 17.13 L8.61 17.13 L8.64 17.14 L8.67 17.14 L8.71 17.15 L8.74 17.15 L8.77 17.15 L8.81 17.16 L8.84 17.16 L8.87 17.17 L8.90 17.17 L8.94 17.17 L8.97 17.17 L9.00 17.18 L9.04 17.18 L9.07 17.18 L9.10 17.18 L9.14 17.19 L9.17 17.19 L9.20 17.19 L9.24 17.19 L9.27 17.19 L9.30 17.19 L9.33 17.20 L9.37 17.20 L9.40 17.20 L9.43 17.20 L9.47 17.20 L9.50 17.20 L9.53 17.20 L9.57 17.20 L9.60 17.20 L9.63 17.20 L9.67 17.20 L9.70 17.20 L9.73 17.20 L9.77 17.20 L9.80 17.20 L9.83 17.20 L9.87 17.20 L9.90 17.19 L9.93 17.19 L9.96 17.19 L10.00 17.19 L10.03 17.19 L10.06 17.19 L10.10 17.18 L10.13 17.18 L10.16 17.18 L10.20 17.18 L10.23 17.17 L10.26 17.17 L10.30 17.17 L10.33 17.17 L10.36 17.16 L10.39 17.16 L10.43 17.15 L10.46 17.15 L10.49 17.15 L10.53 17.14 L10.56 17.14 L10.59 17.13 L10.62 17.13 L10.66 17.13 L10.69 17.12 L10.72 17.12 L10.76 17.11 L10.79 17.11 L10.82 17.10 L10.85 17.10 L10.89 17.09 L10.92 17.08 L10.95 17.08 L10.98 17.07 L11.02 17.07 L11.05 17.06 L11.08 17.05 L11.12 17.05 L11.15 17.04 L11.18 17.03 L11.21 17.03 L11.24 17.02 L11.28 17.01 L11.31 17.01 L11.34 17.00 L11.37 16.99 L11.41 16.98 L11.44 16.97 L11.47 16.97 L11.50 16.96 L11.53 16.95 L11.57 16.94 L11.60 16.93 L11.63 16.92 L11.66 16.91 L11.69 16.91 L11.73 16.90 L11.76 16.89 L11.79 16.88 L11.82 16.87 L11.85 16.86 L11.89 16.85 L11.92 16.84 L11.95 16.83 L11.98 16.82 L12.01 16.81 L12.04 16.80 L12.07 16.79 L12.11 16.78 L12.14 16.76 L12.17 16.75 L12.20 16.74 L12.23 16.73 L12.26 16.72 L12.29 16.71 L12.32 16.70 L12.35 16.68 L12.39 16.67 L12.42 16.66 L12.45 16.65 L12.48 16.63 L12.51 16.62 L12.54 16.61 L12.57 16.60 L12.60 16.58 L12.63 16.57 L12.66 16.56 L12.69 16.54 L12.72 16.53 L12.75 16.52 L12.78 16.50 L12.81 16.49 L12.84 16.47 L12.87 16.46 L12.90 16.45 L12.93 16.43 L12.96 16.42 L12.99 16.40 L13.02 16.39 L13.05 16.37 L13.08 16.36 L13.11 16.34 L13.14 16.33 L13.17 16.31 L13.20 16.29 L13.23 16.28 L13.26 16.26 L13.28 16.25 L13.31 16.23 L13.34 16.21 L13.37 16.20 L13.40 16.18 L13.43 16.17 L13.46 16.15 L13.49 16.13 L13.51 16.11 L13.54 16.10 L13.57 16.08 L13.60 16.06 L13.63 16.05 L13.66 16.03 L13.68 16.01 L13.71 15.99 L13.74 15.97 L13.77 15.96 L13.79 15.94 L13.82 15.92 L13.85 15.90 L13.88 15.88 L13.90 15.86 L13.93 15.84 L13.96 15.83 L13.99 15.81 L14.01 15.79 L14.04 15.77 L14.07 15.75 L14.09 15.73 L14.12 15.71 L14.15 15.69 L14.17 15.67 L14.20 15.65 L14.23 15.63 L14.25 15.61 L14.28 15.59 L14.31 15.57 L14.33 15.55 L14.36 15.53 L14.38 15.51 L14.41 15.49 L14.43 15.46 L14.46 15.44 L14.49 15.42 L14.51 15.40 L14.54 15.38 L14.56 15.36 L14.59 15.34 L14.61 15.31 L14.64 15.29 L14.66 15.27 L14.69 15.25 L14.71 15.23 L14.73 15.20 L14.76 15.18 L14.78 15.16 L14.81 15.14 L14.83 15.11 L14.86 15.09 L14.88 15.07 L14.90 15.04 L14.93 15.02 L14.95 15.00 L14.97 14.97 L15.00 14.95 L15.02 14.93 L15.04 14.90 L15.07 14.88 L15.09 14.86 L15.11 14.83 L15.14 14.81 L15.16 14.78 L15.18 14.76 L15.20 14.73 L15.23 14.71 L15.25 14.69 L15.27 14.66 L15.29 14.64 L15.31 14.61 L15.34 14.59 L15.36 14.56 L15.38 14.54 L15.40 14.51 L15.42 14.49 L15.44 14.46 L15.46 14.43 L15.49 14.41 L15.51 14.38 L15.53 14.36 L15.55 14.33 L15.57 14.31 L15.59 14.28 L15.61 14.25 L15.63 14.23 L15.65 14.20 L15.67 14.17 L15.69 14.15 L15.71 14.12 L15.73 14.09 L15.75 14.07 L15.77 14.04 L15.79 14.01 L15.81 13.99 L15.83 13.96 L15.84 13.93 L15.86 13.90 L15.88 13.88 L15.90 13.85 L15.92 13.82 L15.94 13.79 L15.96 13.77 L15.97 13.74 L15.99 13.71 L16.01 13.68 L16.03 13.66 L16.05 13.63 L16.06 13.60 L16.08 13.57 L16.10 13.54 L16.11 13.51 L16.13 13.49 L16.15 13.46 L16.17 13.43 L16.18 13.40 L16.20 13.37 L16.21 13.34 L16.23 13.31 L16.25 13.28 L16.26 13.26 L16.28 13.23 L16.29 13.20 L16.31 13.17 L16.33 13.14 L16.34 13.11 L16.36 13.08 L16.37 13.05 L16.39 13.02 L16.40 12.99 L16.42 12.96 L16.43 12.93 L16.45 12.90 L16.46 12.87 L16.47 12.84 L16.49 12.81 L16.50 12.78 L16.52 12.75 L16.53 12.72 L16.54 12.69 L16.56 12.66 L16.57 12.63 L16.58 12.60 L16.60 12.57 L16.61 12.54 L16.62 12.51 L16.63 12.48 L16.65 12.45 L16.66 12.42 L16.67 12.39 L16.68 12.35 L16.70 12.32 L16.71 12.29 L16.72 12.26 L16.73 12.23 L16.74 12.20 L16.75 12.17 L16.76 12.14 L16.78 12.11 L16.79 12.07 L16.80 12.04 L16.81 12.01 L16.82 11.98 L16.83 11.95 L16.84 11.92 L16.85 11.89 L16.86 11.85 L16.87 11.82 L16.88 11.79 L16.89 11.76 L16.90 11.73 L16.91 11.69 L16.91 11.66 L16.92 11.63 L16.93 11.60 L16.94 11.57 L16.95 11.53 L16.96 11.50 L16.97 11.47 L16.97 11.44 L16.98 11.41 L16.99 11.37 L17.00 11.34 L17.01 11.31 L17.01 11.28 L17.02 11.24 L17.03 11.21 L17.03 11.18 L17.04 11.15 L17.05 11.12 L17.05 11.08 L17.06 11.05 L17.07 11.02 L17.07 10.98 L17.08 10.95 L17.08 10.95 L17.06 10.97 L17.04 10.99 L17.02 11.01 L17.00 11.02 L16.98 11.04 L16.96 11.06 L16.94 11.08 L16.92 11.10 L16.90 11.12 L16.88 11.13 L16.86 11.15 L16.84 11.17 L16.82 11.19 L16.80 11.20 L16.78 11.22 L16.76 11.24 L16.74 11.26 L16.72 11.27 L16.70 11.29 L16.68 11.31 L16.66 11.32 L16.64 11.34 L16.62 11.36 L16.60 11.37 L16.58 11.39 L16.56 11.41 L16.53 11.42 L16.51 11.44 L16.49 11.46 L16.47 11.47 L16.45 11.49 L16.43 11.50 L16.41 11.52 L16.39 11.54 L16.36 11.55 L16.34 11.57 L16.32 11.58 L16.30 11.60 L16.28 11.61 L16.26 11.63 L16.23 11.64 L16.21 11.66 L16.19 11.67 L16.17 11.69 L16.14 11.70 L16.12 11.72 L16.10 11.73 L16.08 11.74 L16.06 11.76 L16.03 11.77 L16.01 11.79 L15.99 11.80 L15.96 11.81 L15.94 11.83 L15.92 11.84 L15.90 11.86 L15.87 11.87 L15.85 11.88 L15.83 11.90 L15.80 11.91 L15.78 11.92 L15.76 11.94 L15.73 11.95 L15.71 11.96 L15.69 11.97 L15.66 11.99 L15.64 12.00 L15.62 12.01 L15.59 12.02 L15.57 12.04 L15.55 12.05 L15.52 12.06 L15.50 12.07 L15.47 12.08 L15.45 12.09 L15.43 12.11 L15.40 12.12 L15.38 12.13 L15.35 12.14 L15.33 12.15 L15.31 12.16 L15.28 12.17 L15.26 12.18 L15.23 12.19 L15.21 12.20 L15.18 12.22 L15.16 12.23 L15.13 12.24 L15.11 12.25 L15.09 12.26 L15.06 12.27 L15.04 12.28 L15.01 12.29 L14.99 12.29 L14.96 12.30 L14.94 12.31 L14.91 12.32 L14.89 12.33 L14.86 12.34 L14.84 12.35 L14.81 12.36 L14.79 12.37 L14.76 12.38 L14.74 12.38 L14.71 12.39 L14.69 12.40 L14.66 12.41 L14.63 12.42 L14.61 12.43 L14.58 12.43 L14.56 12.44 L14.53 12.45 L14.51 12.46 L14.48 12.46 L14.46 12.47 L14.43 12.48 L14.40 12.49 L14.38 12.49 L14.35 12.50 L14.33 12.51 L14.30 12.51 L14.28 12.52 L14.25 12.53 L14.22 12.53 L14.20 12.54 L14.17 12.54 L14.15 12.55 L14.12 12.56 L14.09 12.56 L14.07 12.57 L14.04 12.57 L14.02 12.58 L13.99 12.58 L13.96 12.59 L13.94 12.59 L13.91 12.60 L13.89 12.60 L13.86 12.61 L13.83 12.61 L13.81 12.62 L13.78 12.62 L13.75 12.62 L13.73 12.63 L13.70 12.63 L13.68 12.64 L13.65 12.64 L13.62 12.64 L13.60 12.65 L13.57 12.65 L13.54 12.65 L13.52 12.66 L13.49 12.66 L13.46 12.66 L13.44 12.67 L13.41 12.67 L13.38 12.67 L13.36 12.67 L13.33 12.68 L13.31 12.68 L13.28 12.68 L13.25 12.68 L13.23 12.69 L13.20 12.69 L13.17 12.69 L13.15 12.69 L13.12 12.69 L13.09 12.69 L13.07 12.69 L13.04 12.70 L13.01 12.70 L12.99 12.70 L12.96 12.70 L12.93 12.70 L12.91 12.70 L12.88 12.70 L12.85 12.70 L12.83 12.70 L12.80 12.70 L12.77 12.70 L12.75 12.70 L12.72 12.70 L12.69 12.70 L12.67 12.70 L12.64 12.70 L12.61 12.70 L12.59 12.70 L12.56 12.70 L12.53 12.69 L12.51 12.69 L12.48 12.69 L12.45 12.69 L12.43 12.69 L12.40 12.69 L12.37 12.69 L12.35 12.68 L12.32 12.68 L12.29 12.68 L12.27 12.68 L12.24 12.67 L12.22 12.67 L12.19 12.67 L12.16 12.67 L12.14 12.66 L12.11 12.66 L12.08 12.66 L12.06 12.65 L12.03 12.65 L12.00 12.65 L11.98 12.64 L11.95 12.64 L11.92 12.64 L11.90 12.63 L11.87 12.63 L11.85 12.62 L11.82 12.62 L11.79 12.62 L11.77 12.61 L11.74 12.61 L11.71 12.60 L11.69 12.60 L11.66 12.59 L11.64 12.59 L11.61 12.58 L11.58 12.58 L11.56 12.57 L11.53 12.57 L11.51 12.56 L11.48 12.56 L11.45 12.55 L11.43 12.54 L11.40 12.54 L11.38 12.53 L11.35 12.53 L11.32 12.52 L11.30 12.51 L11.27 12.51 L11.25 12.50 L11.22 12.49 L11.20 12.49 L11.17 12.48 L11.14 12.47 L11.12 12.46 L11.09 12.46 L11.07 12.45 L11.04 12.44 L11.02 12.43 L10.99 12.43 L10.97 12.42 L10.94 12.41 L10.91 12.40 L10.89 12.39 L10.86 12.38 L10.84 12.38 L10.81 12.37 L10.79 12.36 L10.76 12.35 L10.74 12.34 L10.71 12.33 L10.69 12.32 L10.66 12.31 L10.64 12.30 L10.61 12.29 L10.59 12.29 L10.56 12.28 L10.54 12.27 L10.51 12.26 L10.49 12.25 L10.47 12.24 L10.44 12.23 L10.42 12.22 L10.39 12.20 L10.37 12.19 L10.34 12.18 L10.32 12.17 L10.29 12.16 L10.27 12.15 L10.25 12.14 L10.22 12.13 L10.20 12.12 L10.17 12.11 L10.15 12.09 L10.13 12.08 L10.10 12.07 L10.08 12.06 L10.05 12.05 L10.03 12.04 L10.01 12.02 L9.98 12.01 L9.96 12.00 L9.94 11.99 L9.91 11.97 L9.89 11.96 L9.87 11.95 L9.84 11.94 L9.82 11.92 L9.80 11.91 L9.77 11.90 L9.75 11.88 L9.73 11.87 L9.70 11.86 L9.68 11.84 L9.66 11.83 L9.64 11.81 L9.61 11.80 L9.59 11.79 L9.57 11.77 L9.54 11.76 L9.52 11.74 L9.50 11.73 L9.48 11.72 L9.46 11.70 L9.43 11.69 L9.41 11.67 L9.39 11.66 L9.37 11.64 L9.34 11.63 L9.32 11.61 L9.30 11.60 L9.28 11.58 L9.26 11.57 L9.24 11.55 L9.21 11.54 L9.19 11.52 L9.17 11.50 L9.15 11.49 L9.13 11.47 L9.11 11.46 L9.09 11.44 L9.07 11.42 L9.04 11.41 L9.02 11.39 L9.00 11.37 L8.98 11.36 L8.96 11.34 L8.94 11.32 L8.92 11.31 L8.90 11.29 L8.88 11.27 L8.86 11.26 L8.84 11.24 L8.82 11.22 L8.80 11.20 L8.78 11.19 L8.76 11.17 L8.74 11.15 L8.72 11.13 L8.70 11.12 L8.68 11.10 L8.66 11.08 L8.64 11.06 L8.62 11.04 L8.60 11.02 L8.58 11.01 L8.56 10.99 L8.54 10.97 L8.52 10.95 L8.51 10.93 L8.49 10.91 L8.47 10.89 L8.45 10.88 L8.43 10.86 L8.41 10.84 L8.39 10.82 L8.38 10.80 L8.36 10.78 L8.34 10.76 L8.32 10.74 L8.30 10.72 L8.28 10.70 L8.27 10.68 L8.25 10.66 L8.23 10.64 L8.21 10.62 L8.20 10.60 L8.18 10.58 L8.16 10.56 L8.14 10.54 L8.13 10.52 L8.11 10.50 L8.09 10.48 L8.08 10.46 L8.06 10.44 L8.04 10.42 L8.03 10.40 L8.01 10.38 L7.99 10.36 L7.98 10.33 L7.96 10.31 L7.94 10.29 L7.93 10.27 L7.91 10.25 L7.90 10.23 L7.88 10.21 L7.86 10.19 L7.85 10.16 L7.83 10.14 L7.82 10.12 L7.80 10.10 L7.79 10.08 L7.77 10.06 L7.76 10.03 L7.74 10.01 L7.73 9.99 L7.71 9.97 L7.70 9.94 L7.68 9.92 L7.67 9.90 L7.66 9.88 L7.64 9.86 L7.63 9.83 L7.61 9.81 L7.60 9.79 L7.59 9.76 L7.57 9.74 L7.56 9.72 L7.54 9.70 L7.53 9.67 L7.52 9.65 L7.50 9.63 L7.49 9.60 L7.48 9.58 L7.46 9.56 L7.45 9.53 L7.44 9.51 L7.43 9.49 L7.41 9.46 L7.40 9.44 L7.39 9.42 L7.38 9.39 L7.36 9.37 L7.35 9.35 L7.34 9.32 L7.33 9.30 L7.32 9.27 L7.31 9.25 L7.29 9.23 L7.28 9.20 L7.27 9.18 L7.26 9.15 L7.25 9.13 L7.24 9.11 L7.23 9.08 L7.22 9.06 L7.21 9.03 L7.20 9.01 L7.18 8.98 L7.17 8.96 L7.16 8.93 L7.15 8.91 L7.14 8.89 L7.13 8.86 L7.12 8.84 L7.11 8.81 L7.11 8.79 L7.10 8.76 L7.09 8.74 L7.08 8.71 L7.07 8.69 L7.06 8.66 L7.05 8.64 L7.04 8.61 L7.03 8.59 L7.02 8.56 L7.02 8.54 L7.01 8.51 L7.00 8.49 L6.99 8.46 L6.98 8.43 L6.97 8.41 L6.97 8.38 L6.96 8.36 L6.95 8.33 L6.94 8.31 L6.94 8.28 L6.93 8.26 L6.92 8.23 L6.91 8.20 L6.91 8.18 L6.90 8.15 L6.89 8.13 L6.89 8.10 L6.88 8.08 L6.87 8.05 L6.87 8.02 L6.86 8.00 L6.86 7.97 L6.85 7.95 L6.84 7.92 L6.84 7.89 L6.83 7.87 L6.83 7.84 L6.82 7.82 L6.82 7.79 L6.81 7.76 L6.81 7.74 L6.80 7.71 L6.80 7.69 L6.79 7.66 L6.79 7.63 L6.78 7.61 L6.78 7.58 L6.78 7.55 L6.77 7.53 L6.77 7.50 L6.76 7.48 L6.76 7.45 L6.76 7.42 L6.75 7.40 L6.75 7.37 L6.75 7.34 L6.74 7.32 L6.74 7.29 L6.74 7.26 L6.73 7.24 L6.73 7.21 L6.73 7.18 L6.73 7.16 L6.72 7.13 L6.72 7.11 L6.72 7.08 L6.72 7.05 L6.71 7.03 L6.71 7.00 L6.71 6.97 L6.71 6.95 L6.71 6.92 L6.71 6.89 L6.71 6.87 L6.70 6.84 L6.70 6.81 L6.70 6.79 L6.70 6.76 L6.70 6.73 L6.70 6.71 L6.70 6.68 L6.70 6.65 L6.70 6.63 L6.70 6.60 L6.70 6.57 L6.70 6.55 L6.70 6.52 L6.70 6.49 L6.70 6.47 L6.70 6.44 L6.70 6.41 L6.70 6.39 L6.70 6.36 L6.71 6.33 L6.71 6.31 L6.71 6.28 L6.71 6.25 L6.71 6.23 L6.71 6.20 L6.71 6.17 L6.72 6.15 L6.72 6.12 L6.72 6.09 L6.72 6.07 L6.73 6.04 L6.73 6.02 L6.73 5.99 L6.73 5.96 L6.74 5.94 L6.74 5.91 L6.74 5.88 L6.75 5.86 L6.75 5.83 L6.75 5.80 L6.76 5.78 L6.76 5.75 L6.76 5.72 L6.77 5.70 L6.77 5.67 L6.78 5.65 L6.78 5.62 L6.78 5.59 L6.79 5.57 L6.79 5.54 L6.80 5.51 L6.80 5.49 L6.81 5.46 L6.81 5.44 L6.82 5.41 L6.82 5.38 L6.83 5.36 L6.83 5.33 L6.84 5.31 L6.84 5.28 L6.85 5.25 L6.86 5.23 L6.86 5.20 L6.87 5.18 L6.87 5.15 L6.88 5.12 L6.89 5.10 L6.89 5.07 L6.90 5.05 L6.91 5.02 L6.91 5.00 L6.92 4.97 L6.93 4.94 L6.94 4.92 L6.94 4.89 L6.95 4.87 L6.96 4.84 L6.97 4.82 L6.97 4.79 L6.98 4.77 L6.99 4.74 L7.00 4.71 L7.01 4.69 L7.02 4.66 L7.02 4.64 L7.03 4.61 L7.04 4.59 L7.05 4.56 L7.06 4.54 L7.07 4.51 L7.08 4.49 L7.09 4.46 L7.10 4.44 L7.11 4.41 L7.11 4.39 L7.12 4.36 L7.13 4.34 L7.14 4.31 L7.15 4.29 L7.16 4.27 L7.17 4.24 L7.18 4.22 L7.20 4.19 L7.21 4.17 L7.22 4.14 L7.23 4.12 L7.24 4.09 L7.25 4.07 L7.26 4.05 L7.27 4.02 L7.28 4.00 L7.29 3.97 L7.31 3.95 L7.32 3.93 L7.33 3.90 L7.34 3.88 L7.35 3.85 L7.36 3.83 L7.38 3.81 L7.39 3.78 L7.40 3.76 L7.41 3.74 L7.43 3.71 L7.44 3.69 L7.45 3.67 L7.46 3.64 L7.48 3.62 L7.49 3.60 L7.50 3.57 L7.52 3.55 L7.53 3.53 L7.54 3.50 L7.56 3.48 L7.57 3.46 L7.59 3.44 L7.60 3.41 L7.61 3.39 L7.63 3.37 L7.64 3.34 L7.66 3.32 L7.67 3.30 L7.68 3.28 L7.70 3.26 L7.71 3.23 L7.73 3.21 L7.74 3.19 L7.76 3.17 L7.77 3.14 L7.79 3.12 L7.80 3.10 L7.82 3.08 L7.83 3.06 L7.85 3.04 L7.86 3.01 L7.88 2.99 L7.90 2.97 L7.91 2.95 L7.93 2.93 L7.94 2.91 L7.96 2.89 L7.98 2.87 L7.99 2.84 L8.01 2.82 L8.03 2.80 L8.04 2.78 L8.06 2.76 L8.08 2.74 L8.09 2.72 L8.11 2.70 L8.13 2.68 L8.14 2.66 L8.16 2.64 L8.18 2.62 L8.20 2.60 L8.21 2.58 L8.23 2.56 L8.25 2.54 L8.27 2.52 L8.28 2.50 L8.30 2.48 L8.32 2.46 L8.34 2.44 L8.36 2.42 L8.38 2.40 L8.39 2.38 L8.41 2.36 L8.43 2.34 L8.45 2.32 L8.47 2.31 L8.49 2.29 L8.51 2.27 L8.52 2.25 L8.54 2.23 L8.56 2.21 L8.58 2.19 L8.60 2.18 L8.62 2.16 L8.64 2.14 L8.66 2.12 L8.68 2.10 L8.70 2.08 L8.72 2.07 L8.74 2.05 Z"/><path d="M14.2 14.2 L20.6 20.6" stroke="#C8201E" stroke-width="2.4" stroke-linecap="round"/><path d="M4.4 20.4 L13.2 11.6" stroke="#C8201E" stroke-width="2.4" stroke-linecap="round"/><rect x="11.9" y="7.8" width="7.6" height="3.6" rx="0.8" transform="rotate(-45 15.7 9.6)"/></g></svg>`;

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ligar = (t) => t.replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow">${u}</a>`);

let eu = null;
let minhaPapel = "";
let mensagens = [];
let autores = new Map();
let ultimoEnvio = 0;
let souAtivo = false;
let gravador = null;
let pedacos = [];
let temporizador = null;
let inicioGravacao = 0;

function avisar(texto) { $("aviso-chat").textContent = texto; $("aviso-chat").hidden = !texto; }

function fora(texto, comLogin) {
  $("area").hidden = true;
  $("entrada").hidden = false;
  $("entrada").innerHTML = esc(texto) + (comLogin ? ' <a href="conta.html">Entrar na conta</a>' : "");
}

// selos: "Membro ativo" + a primeira ocupação, ou "Membro comum"
function selosDe(funcao) {
  const texto = String(funcao || "");
  if (/comum/i.test(texto)) return { ativo: false, selos: ["Membro comum"] };
  const ocupacoes = texto.split("·").map((t) => t.trim()).filter((t) => t && !/^membro( ativo)?$/i.test(t));
  return { ativo: true, selos: ["Membro ativo", ...ocupacoes.slice(0, 1)] };
}

function horario(iso) {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje ? hora : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + hora;
}

function msgHTML(m) {
  const a = autores.get(m.autor_id) || { nome: "Membro", foto: "", funcao: "Membro comum" };
  const { ativo, selos } = selosDe(a.funcao);
  const meu = m.autor_id === eu.id;
  const corpo = m.tipo === "audio"
    ? `<audio class="audio" controls preload="none" src="${esc(m.imagem_url)}"></audio>`
    : m.tipo === "imagem"
      ? `<a href="${esc(m.imagem_url)}" target="_blank" rel="noopener"><img class="midia" src="${esc(m.imagem_url)}" alt="Imagem enviada no bate-papo" loading="lazy"></a>`
      : `<p class="texto">${ligar(esc(m.texto))}</p>`;
  const pode = meu || minhaPapel === "admin";
  return `<article class="msg${meu ? " msg--eu" : ""}" data-id="${m.id}">
    <img class="msg__foto" src="${esc(a.foto || "assets/img/avatar.svg")}" alt="">
    <div class="msg__corpo">
      <header class="msg__cab">
        <strong>${esc(a.nome || "Membro")}</strong>${ativo ? SELO_ATIVO : ""}
        ${selos.map((s) => `<span class="badge${s === "Membro ativo" ? " badge--ativo" : ""}">${esc(s)}</span>`).join("")}
        <time datetime="${esc(m.criado_em)}">${horario(m.criado_em)}</time>
      </header>
      ${corpo}
      ${pode ? `<button type="button" class="apagar" data-id="${m.id}">apagar</button>` : ""}
    </div>
  </article>`;
}

function desenhar() {
  const lista = $("lista");
  const perto = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 120;
  const vazio = mensagens.length === 0;
  lista.innerHTML = vazio
    ? '<p class="vazio">Ainda não há mensagens. Comece a conversa!</p>'
    : mensagens.map(msgHTML).join("");
  if (perto || vazio) lista.scrollTop = lista.scrollHeight;
}

function limparVencidas() {
  const agora = Date.now();
  const antes = mensagens.length;
  mensagens = mensagens.filter((m) => agora - new Date(m.criado_em).getTime() < SETENTA_E_DUAS_HORAS);
  if (mensagens.length !== antes) desenhar();
}

async function carregarAutores() {
  const { data } = await supa.from("membros_publicos").select("id,nome,foto,funcao");
  autores = new Map((data || []).map((p) => [p.id, p]));
}

async function carregarMensagens() {
  const { data, error } = await supa.from("chat_mensagens")
    .select("id,autor_id,tipo,texto,imagem_url,criado_em")
    .gt("criado_em", new Date(Date.now() - SETENTA_E_DUAS_HORAS).toISOString())
    .order("criado_em", { ascending: true })
    .limit(300);
  if (error) return avisar("Não foi possível carregar o bate-papo agora. Tente de novo.");
  mensagens = data || [];
  desenhar();
}

function adicionar(m) {
  if (mensagens.some((x) => x.id === m.id)) return;
  mensagens.push(m);
  mensagens.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  desenhar();
}

function podeEnviar() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO) { avisar("Espere um instante antes de enviar de novo."); return false; }
  ultimoEnvio = agora;
  avisar("");
  return true;
}

async function enviarTexto(e) {
  e.preventDefault();
  const campo = $("texto");
  const texto = campo.value.trim();
  if (!texto) return;
  if (texto.length > LIMITE_TEXTO) return avisar(`Mensagem muito longa (máximo de ${LIMITE_TEXTO} caracteres).`);
  if (!podeEnviar()) return;
  const { error } = await supa.from("chat_mensagens").insert({ autor_id: eu.id, tipo: "texto", texto });
  if (error) return avisar("Não foi possível enviar: " + error.message);
  campo.value = "";
  carregarMensagens();
}

async function enviarImagem(arquivo) {
  if (!TIPOS_IMAGEM.includes(arquivo.type)) return avisar("Envie uma imagem PNG, JPG, WEBP ou GIF.");
  if (arquivo.size > MAX_BYTES) return avisar("A imagem passa de 5 MB. Escolha uma menor.");
  if (!podeEnviar()) return;
  avisar("Enviando imagem…");
  const nome = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `${eu.id}/${Date.now()}-${nome}`;
  const { error: erroEnvio } = await supa.storage.from("chat").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (erroEnvio) return avisar("Não foi possível enviar a imagem: " + erroEnvio.message);
  const url = supa.storage.from("chat").getPublicUrl(caminho).data.publicUrl;
  const { error } = await supa.from("chat_mensagens").insert({ autor_id: eu.id, tipo: "imagem", imagem_url: url });
  if (error) return avisar("Não foi possível enviar: " + error.message);
  avisar("");
  carregarMensagens();
}

function atualizarBotaoGravar() {
  const b = $("gravar");
  if (!b) return;
  if (gravador && gravador.state === "recording") {
    const seg = Math.floor((Date.now() - inicioGravacao) / 1000);
    b.textContent = `■ Parar e enviar (${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")})`;
    b.classList.add("gravando");
  } else {
    b.textContent = "● Gravar áudio";
    b.classList.remove("gravando");
  }
}

async function alternarGravacao() {
  if (gravador && gravador.state === "recording") { gravador.stop(); return; }
  if (!souAtivo) return avisar("Só membros ativos podem enviar áudio.");
  if (!window.MediaRecorder || !navigator.mediaDevices) return avisar("Este navegador não permite gravar áudio.");
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { return avisar("Permita o uso do microfone para gravar."); }
  const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((t) => MediaRecorder.isTypeSupported(t)) || "";
  gravador = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  pedacos = [];
  gravador.ondataavailable = (e) => { if (e.data && e.data.size) pedacos.push(e.data); };
  gravador.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(temporizador);
    atualizarBotaoGravar();
    enviarAudio(new Blob(pedacos, { type: gravador.mimeType || tipo || "audio/webm" }));
  };
  gravador.start();
  inicioGravacao = Date.now();
  temporizador = setInterval(() => {
    if (Date.now() - inicioGravacao >= MAX_AUDIO_MS) { gravador.stop(); return; }
    atualizarBotaoGravar();
  }, 500);
  atualizarBotaoGravar();
  avisar("");
}

async function enviarAudio(blob) {
  if (!blob.size) return avisar("Não consegui gravar o áudio. Tente de novo.");
  if (blob.size > MAX_BYTES) return avisar("Áudio grande demais. Grave um trecho menor.");
  if (!podeEnviar()) return;
  const tipo = blob.type.split(";")[0] || "audio/webm";
  const ext = tipo.includes("ogg") ? "ogg" : tipo.includes("mp4") ? "m4a" : "webm";
  const caminho = `${eu.id}/${Date.now()}-audio.${ext}`;
  avisar("Enviando áudio…");
  const { error: erroEnvio } = await supa.storage.from("chat").upload(caminho, blob, { contentType: tipo, upsert: false });
  if (erroEnvio) return avisar("Não foi possível enviar o áudio: " + erroEnvio.message);
  const url = supa.storage.from("chat").getPublicUrl(caminho).data.publicUrl;
  const { error } = await supa.from("chat_mensagens").insert({ autor_id: eu.id, tipo: "audio", imagem_url: url });
  if (error) return avisar("Não foi possível enviar: " + error.message);
  avisar("");
  carregarMensagens();
}

async function iniciar() {
  const { data: sessao } = await supa.auth.getSession();
  if (!sessao || !sessao.session) return fora("Entre na sua conta para participar do bate-papo.", true);
  const { data: aprovado } = await supa.rpc("sou_aprovado");
  if (aprovado !== true) return fora("O bate-papo é para membros aprovados. Se você acabou de se cadastrar, aguarde a aprovação da secretaria.", false);

  eu = sessao.session.user;
  const { data: perfil } = await supa.from("perfis").select("papel,funcao").eq("id", eu.id).single();
  minhaPapel = perfil ? perfil.papel : "";
  souAtivo = !!perfil && !/comum/i.test(perfil.funcao || "");
  $("gravar").hidden = !souAtivo;
  $("gravar").addEventListener("click", alternarGravacao);
  $("entrada").hidden = true;
  $("area").hidden = false;

  $("form").addEventListener("submit", enviarTexto);
  $("texto").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("form").requestSubmit(); } });
  $("arquivo").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) enviarImagem(f); });
  $("lista").addEventListener("click", async (e) => {
    const b = e.target.closest(".apagar");
    if (!b || !confirm("Apagar esta mensagem?")) return;
    const { error } = await supa.from("chat_mensagens").delete().eq("id", b.dataset.id);
    if (error) return avisar("Não foi possível apagar: " + error.message);
    carregarMensagens();
  });

  await carregarAutores();
  await carregarMensagens();
  supa.channel("chat-mensagens")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, async (p) => {
      if (!autores.has(p.new.autor_id)) await carregarAutores();
      adicionar(p.new);
    })
    .subscribe();
  setInterval(carregarMensagens, 30000);   // reconcilia apagamentos feitos por outras pessoas
  setInterval(limparVencidas, 60000);      // some com as mensagens que passaram de 72 horas
}

iniciar().catch(() => avisar("Não foi possível abrir o bate-papo agora. Tente de novo."));

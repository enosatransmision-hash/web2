import { Estructura } from '../types';
import { storageService } from '../services/storageService';

/**
 * Obtiene la lista única y ordenada de números de poste ("POSTE N°")
 * que pertenecen exclusivamente a una línea seleccionada,
 * extrayéndolos directamente de la plantilla de estructuras.
 */
export function getPostesForLine(
  estructuras: Estructura[] | undefined,
  codLinea: string | undefined | null
): string[] {
  if (!codLinea || codLinea === 'TODAS') return [];
  
  const list = (estructuras && estructuras.length > 0)
    ? estructuras.filter(e => e.cod_linea === codLinea)
    : storageService.getEstructuras(codLinea);

  const unique = Array.from(
    new Set(list.map(e => String(e.poste_n || '').trim()).filter(Boolean))
  );

  return unique.sort((a, b) => {
    const matchA = a.match(/^(\d+)(.*)$/);
    const matchB = b.match(/^(\d+)(.*)$/);
    if (matchA && matchB) {
      const numA = parseInt(matchA[1], 10);
      const numB = parseInt(matchB[1], 10);
      if (numA !== numB) return numA - numB;
      return matchA[2].localeCompare(matchB[2]);
    }
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
}

/**
 * Busca los datos técnicos de una estructura en la plantilla
 */
export function getStructureDetails(
  estructuras: Estructura[] | undefined,
  codLinea: string | undefined | null,
  posteN: string | undefined | null
): Estructura | undefined {
  if (!codLinea || !posteN) return undefined;
  const list = (estructuras && estructuras.length > 0)
    ? estructuras
    : storageService.getEstructuras(codLinea);
  
  const trimmed = String(posteN).trim();
  return list.find(e => e.cod_linea === codLinea && String(e.poste_n).trim() === trimmed);
}

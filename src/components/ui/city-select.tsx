import { forwardRef } from 'react'
import { useCidades } from '@/hooks/useCidades'
import { Select } from '@/components/ui/select'

interface CitySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  uf: string
  error?: string
  placeholder?: string
}

export const CitySelect = forwardRef<HTMLSelectElement, CitySelectProps>(
  ({ uf, error, placeholder = 'Selecione a cidade', ...props }, ref) => {
    const { data: cidades = [], isLoading } = useCidades(uf)

    return (
      <Select ref={ref} error={error} disabled={!uf || isLoading} {...props}>
        <option value="">
          {!uf ? 'Selecione o estado primeiro' : isLoading ? 'Carregando cidades...' : placeholder}
        </option>
        {cidades.map((cidade) => (
          <option key={cidade} value={cidade}>{cidade}</option>
        ))}
      </Select>
    )
  }
)

CitySelect.displayName = 'CitySelect'

import { useParams } from 'react-router-dom';
import { useCustomDiscount } from '@/hooks/use-custom-discounts';
import DiscountWizardPage from './wizard';

export default function DiscountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const discountQuery = useCustomDiscount(id ?? '');

  if (!id) return null;

  const detail = discountQuery.data;
  const discount = detail?.discount;

  if (discountQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!discount) return null;

  const mode = discount.status === 'draft' ? 'edit' : 'view';

  return <DiscountWizardPage mode={mode} discountId={id} />;
}

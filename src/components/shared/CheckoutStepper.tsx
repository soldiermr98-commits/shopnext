import React from 'react';
import { toPersianDigits } from '../../lib/persian';

interface StepperProps {
  currentStep: 1 | 2 | 3;
}

export const CheckoutStepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'سبد خرید', subtitle: 'بررسی و تغییر اقلام' },
    { number: 2, title: 'اطلاعات ارسال', subtitle: 'آدرس و شیوه تحویل' },
    { number: 3, title: 'بازبینی و پرداخت', subtitle: 'تسویه نهایی سفارش' },
  ];

  return (
    <section className="w-full bg-surface-container-lowest border-b border-outline-variant/60 py-4 no-print">
      <div className="max-w-[1320px] mx-auto px-margin-mobile md:px-margin-desktop">
        <nav aria-label="مراحل خرید" className="flex items-center justify-center max-w-2xl mx-auto">
          <ol className="flex items-center w-full justify-between relative">
            {steps.map((step, idx) => {
              const isCompleted = step.number < currentStep;
              const isActive = step.number === currentStep;

              return (
                <React.Fragment key={step.number}>
                  {idx > 0 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                        step.number <= currentStep ? 'bg-emerald-500' : 'bg-outline-variant/60'
                      }`}
                    />
                  )}
                  <li className="flex items-center gap-2 relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500/20'
                          : isActive
                          ? 'bg-primary text-on-primary ring-4 ring-primary-fixed shadow-md'
                          : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      ) : (
                        <span>{toPersianDigits(step.number)}</span>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col text-right">
                      <span
                        className={`text-label-md font-label-md font-bold ${
                          isActive ? 'text-primary' : 'text-on-surface'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-[11px] text-outline">
                        {isCompleted ? 'تکمیل شده' : isActive ? 'گام فعال' : step.subtitle}
                      </span>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </nav>
      </div>
    </section>
  );
};

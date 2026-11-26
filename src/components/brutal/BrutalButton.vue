<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'white' | 'black'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'yellow',
    size: 'md',
    type: 'button',
    disabled: false,
  }
)

const variantClasses: Record<string, string> = {
  yellow: 'bg-[#FFD100] text-black hover:bg-[#ffe047]',
  green: 'bg-[#00E5A0] text-black hover:bg-[#2ef0b5]',
  red: 'bg-[#FF5E5B] text-white hover:bg-[#ff7875]',
  blue: 'bg-[#3B82F6] text-white hover:bg-[#60a5fa]',
  purple: 'bg-[#A855F7] text-white hover:bg-[#c084fc]',
  white: 'bg-white text-black hover:bg-neutral-100',
  black: 'bg-black text-white hover:bg-neutral-800',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm md:text-base',
  lg: 'px-6 py-3.5 text-base md:text-lg',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 font-bold border-[3px] border-black rounded-md brutal-shadow transition-all cursor-pointer select-none',
      'active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000]',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <slot />
  </button>
</template>


# frozen_string_literal: true

FactoryBot.define do
  factory :note do
    content { 'Hey welcome to kovaa-lab' }
    account
    user
    contact
  end
end
